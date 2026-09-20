import { NextRequest, NextResponse } from "next/server";
import { messagingApi, webhook } from "@line/bot-sdk";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Initialize LINE Client
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const channelSecret = process.env.LINE_CHANNEL_SECRET || "";
const lineClient = new messagingApi.MessagingApiClient({ channelAccessToken });

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    console.log("📥 [Webhook] Received request body:", bodyText);
    
    const signature = req.headers.get("x-line-signature") as string;
    console.log("🔑 [Webhook] Signature:", signature);

    // Verify LINE Signature
    const hash = crypto.createHmac("sha256", channelSecret).update(bodyText).digest("base64");
    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body: webhook.CallbackRequest = JSON.parse(bodyText);

    // Process events
    for (const event of body.events) {
      try {
        if (event.type === "message" && event.message.type === "image") {
          const messageId = event.message.id;
          const replyToken = (event as any).replyToken as string;

          // 1. Download image from LINE
          const imageRes = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
            headers: { Authorization: `Bearer ${channelAccessToken}` },
          });
          const arrayBuffer = await imageRes.arrayBuffer();
          const base64Image = Buffer.from(arrayBuffer).toString("base64");

          // 2. Send image to Gemini via Direct Fetch (Bypassing SDK Auth Bug)
          const prompt = `
            คุณคือผู้ช่วยจัดการตารางนัดหมาย 
            โปรดดึงข้อมูลจากการ์ดนัดหมายหรือภาพนี้ และส่งคืนมาในรูปแบบ JSON ดังนี้:
            {
              "title": "ชื่อการนัดหมายแบบย่อ (เช่น นัดตรวจสุขภาพ, นัดหมอฟัน)",
              "date": "วันและเวลาในรูปแบบ ISO-8601 (เช่น 2026-10-15T09:00:00Z)",
              "location": "สถานที่ (ถ้ามี)",
              "description": "รายละเอียดเพิ่มเติม (ถ้ามี)",
              "doctorName": "ชื่อแพทย์ (ถ้ามี)",
              "patientName": "ชื่อคนไข้ (ถ้ามี)",
              "disease": "โรค หรือ อาการ (ถ้ามี)"
            }
            ถ้าไม่มีเวลา ให้ใส่เวลา 09:00:00 เป็นค่าเริ่มต้น
          `;

          const { GoogleGenerativeAI } = require("@google/generative-ai");
          const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
          const model = ai.getGenerativeModel({ model: "gemini-flash-latest" });
          
          console.log("🚀 [Webhook] Sending to Gemini (via generative-ai SDK)...");
          
          let jsonText = "{}";
          try {
            const response = await model.generateContent([
              prompt,
              {
                inlineData: {
                  data: base64Image,
                  mimeType: "image/jpeg"
                }
              }
            ]);
            jsonText = response.response.text() || "{}";
          } catch (error) {
            console.error("❌ [Webhook] Gemini Error:", error);
            await lineClient.replyMessage({
              replyToken,
              messages: [{ type: "text", text: "ขออภัยครับ พบข้อผิดพลาดในการเชื่อมต่อกับ AI ลองใหม่อีกครั้งนะครับ" }],
            });
            continue;
          }
          let appointmentData: any = {};
          try {
            // Remove Markdown formatting if Gemini wraps the response in ```json ... ```
            const cleanedJsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
            appointmentData = JSON.parse(cleanedJsonText);
          } catch (e) {
            console.error("Failed to parse Gemini JSON:", jsonText);
          }

          if (appointmentData.title && appointmentData.date) {
            // 3. Instead of saving, we construct a review URL
            const params = new URLSearchParams();
            params.append("review", "true");
            params.append("title", appointmentData.title);
            
            const d = new Date(appointmentData.date);
            if (!isNaN(d.getTime())) {
              const dString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              const tString = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
              params.append("date", dString);
              params.append("time", tString);
            }

            if (appointmentData.doctorName) params.append("doctorName", String(appointmentData.doctorName).substring(0, 50));
            if (appointmentData.patientName) params.append("patientName", String(appointmentData.patientName).substring(0, 50));
            if (appointmentData.disease) params.append("disease", String(appointmentData.disease).substring(0, 100));
            if (appointmentData.location) params.append("location", String(appointmentData.location).substring(0, 100));
            if (appointmentData.description) params.append("description", String(appointmentData.description).substring(0, 200));

            const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
            const reviewUrl = `https://${host}/?${params.toString()}`;

            // 4. Reply with Flex Message to review
            const formattedDate = !isNaN(d.getTime()) 
              ? d.toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" }) 
              : "ไม่ระบุเวลา";

            try {
              await lineClient.replyMessage({
                replyToken,
                messages: [
                  {
                    type: "flex",
                    altText: `ตรวจสอบนัดหมาย: ${appointmentData.title}`,
                    contents: {
                      type: "bubble",
                      body: {
                        type: "box",
                        layout: "vertical",
                        contents: [
                          { type: "text", text: "🔍 สกัดข้อมูลสำเร็จ!", weight: "bold", size: "xl", color: "#F59E0B" },
                          { type: "text", text: "กรุณาตรวจสอบความถูกต้องก่อนบันทึก", size: "sm", color: "#666666", wrap: true, margin: "sm" },
                          { type: "text", text: appointmentData.title, weight: "bold", size: "md", margin: "md", wrap: true },
                          { type: "text", text: `🗓️ เวลา: ${formattedDate}`, size: "sm", color: "#666666", wrap: true },
                        ],
                      },
                      footer: {
                        type: "box",
                        layout: "vertical",
                        contents: [
                          {
                            type: "button",
                            style: "primary",
                            color: "#F59E0B",
                            action: {
                              type: "uri",
                              label: "ตรวจสอบและบันทึก",
                              uri: reviewUrl.substring(0, 1000),
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              });
            } catch (lineErr) {
              console.error("LINE Reply Error:", lineErr);
              // Fallback if flex message fails (e.g. URI too long)
              await lineClient.replyMessage({
                replyToken,
                messages: [{ type: "text", text: `สกัดข้อมูลสำเร็จ! แต่ข้อมูลยาวเกินไป โปรดเข้าเว็บเพื่อเพิ่มข้อมูลด้วยตัวเองนะครับ\n\nหัวข้อ: ${appointmentData.title}` }]
              });
            }
          } else {
            await lineClient.replyMessage({
              replyToken,
              messages: [{ type: "text", text: "ขออภัยครับ AI ไม่สามารถดึงข้อมูลวันและเวลาจากรูปนี้ได้ชัดเจน ลองส่งรูปใหม่อีกครั้งนะครับ" }],
            });
          }
        } else if (event.type === "message" && event.message.type === "text") {
          // Ignore text messages in groups to avoid spamming
          if (event.source.type !== "group" && event.source.type !== "room") {
            await lineClient.replyMessage({
              replyToken: (event as any).replyToken as string,
              messages: [{ type: "text", text: "ส่งรูปใบนัดหรือการ์ดนัดหมายมาให้ผมจัดการลงปฏิทินได้เลยครับ! 📅" }],
            });
          }
        }
      } catch (err: any) {
        console.error("❌ [Webhook] Internal Event Error:", err);
        const replyToken = (event as any).replyToken as string;
        if (replyToken) {
          try {
            await lineClient.replyMessage({
              replyToken,
              messages: [{ type: "text", text: `พบข้อผิดพลาดระบบ: ${err.message}` }],
            });
          } catch (e) {
            console.error("❌ [Webhook] Failed to send fallback error message:", e);
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
