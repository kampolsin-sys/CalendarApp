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
          // 3. Save to Database (Prisma)
          const newAppointment = await prisma.appointment.create({
            data: {
              title: appointmentData.title,
              date: new Date(appointmentData.date),
              location: appointmentData.location || "",
              description: appointmentData.description || "",
              doctorName: appointmentData.doctorName || null,
              patientName: appointmentData.patientName || null,
              disease: appointmentData.disease || null,
              userId: event.source?.userId || null,
            },
          });

          // 4. Reply with Flex Message
          const formattedDate = new Date(newAppointment.date).toLocaleString("th-TH", {
            dateStyle: "long",
            timeStyle: "short",
          });

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "flex",
                altText: `เพิ่มนัดหมาย: ${newAppointment.title}`,
                contents: {
                  type: "bubble",
                  body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                      { type: "text", text: "📅 บันทึกนัดหมายเรียบร้อย!", weight: "bold", size: "xl", color: "#1DB446" },
                      { type: "text", text: newAppointment.title, weight: "bold", size: "md", margin: "md", wrap: true },
                      { type: "text", text: `🗓️ เวลา: ${formattedDate}`, size: "sm", color: "#666666", wrap: true },
                      { type: "text", text: `📍 สถานที่: ${newAppointment.location || "-"}`, size: "sm", color: "#666666", wrap: true },
                    ],
                  },
                  footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                      {
                        type: "button",
                        style: "primary",
                        color: "#1DB446",
                        action: {
                          type: "uri",
                          label: "ดูตารางทั้งหมด",
                          uri: `https://${req.headers.get("x-forwarded-host") || req.headers.get("host")}/`,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          });
        } else {
          await lineClient.replyMessage({
            replyToken,
            messages: [{ type: "text", text: "ขออภัยครับ AI ไม่สามารถดึงข้อมูลวันและเวลาจากรูปนี้ได้ชัดเจน ลองส่งรูปใหม่อีกครั้งนะครับ" }],
          });
        }
      } else if (event.type === "message" && event.message.type === "text") {
        await lineClient.replyMessage({
          replyToken: (event as any).replyToken as string,
          messages: [{ type: "text", text: "ส่งรูปใบนัดหรือการ์ดนัดหมายมาให้ผมจัดการลงปฏิทินได้เลยครับ! 📅" }],
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
