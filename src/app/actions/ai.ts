"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function extractAppointmentFromImage(base64Image: string) {
  try {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = ai.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const prompt = `
      คุณคือผู้ช่วยจัดการตารางนัดหมาย 
      โปรดดึงข้อมูลจากการ์ดนัดหมายหรือภาพนี้ และส่งคืนมาในรูปแบบ JSON ดังนี้:
      {
        "title": "ชื่อการนัดหมายแบบย่อ (เช่น นัดตรวจสุขภาพ, นัดหมอฟัน)",
        "date": "วันและเวลาในรูปแบบ ISO-8601 (เช่น 2026-10-15T09:00:00Z)",
        "location": "สถานที่ (ถ้ามี)",
        "description": "รายละเอียดเพิ่มเติมทั้งหมดที่อยู่ในบัตร เช่น คำแนะนำจากแพทย์, การเตรียมตัวก่อนมาพบแพทย์, หรือหมายเหตุอื่นๆ ให้ดึงมาใส่ในช่องนี้ทั้งหมดให้ครบถ้วน",
        "doctorName": "ชื่อแพทย์ (ถ้ามี)",
        "patientName": "ชื่อคนไข้ (ถ้ามี)",
        "disease": "โรค หรือ อาการ (ถ้ามี)"
      }
      ถ้าไม่มีเวลา ให้ใส่เวลา 09:00:00 เป็นค่าเริ่มต้น
    `;

    // Ensure we only pass the raw base64 data, stripping 'data:image/jpeg;base64,' if present
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: "image/jpeg"
        }
      }
    ]);
    
    let jsonText = response.response.text() || "{}";
    const cleanedJsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
      const parsed = JSON.parse(cleanedJsonText);
      return { success: true, data: parsed };
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", jsonText);
      return { success: false, error: "ไม่สามารถสกัดข้อมูลจากภาพได้ (รูปแบบข้อมูลไม่ถูกต้อง)" };
    }
  } catch (error: any) {
    console.error("AI Extraction Error:", error);
    return { success: false, error: "พบข้อผิดพลาดในการเชื่อมต่อกับ AI: " + error.message };
  }
}
