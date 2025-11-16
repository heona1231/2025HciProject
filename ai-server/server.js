import express from "express";
import multer from "multer";
import cors from "cors";
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/analyze", upload.array("images"), async (req, res) => {
  try {
    const { link } = req.body;
    const files = req.files || [];

    const images = files.map(file => ({
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: "image/jpeg"
      }
    }));

    const prompt = `
당신은 행사 정보를 구조화하는 AI 비서입니다.
입력되는 웹 링크와 행사 포스터 이미지를 기반으로 아래 JSON 형식에 맞게 행사를 정리하세요.

출력 JSON 형식:
{
  "event_title": "string",
  "d_day": "string",
  "event_overview": "string",
  "date_range": {
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "duration_days": "number"
  },
  "daily_hours": "string",
  "reservation_info": {
    "open_date": "YYYY-MM-DD HH:mm",
    "method": "string",
    "requirements": "string"
  },
  "entrance_info": {
    "entry_time": "string",
    "entry_items": ["string"]
  },
  "event_contents": [
    { "title": "string", "description": "string" }
  ],
  "event_benefits": ["string"],
  "goods_list": [
    { "goods_name": "string", "price": "string" }
  ]
}

주의:
- 반드시 위 JSON 구조로만 반환하세요.
- 설명용 문장이나 여분의 텍스트는 포함하지 마세요.
행사 관련 링크: ${link ?? "제공되지 않음"}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([prompt, ...images]);
    const text = result.response.text();

    return res.json({ success: true, event: text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(4000, () =>
  console.log("✨ Gemini Event Server running on :4000")
);
