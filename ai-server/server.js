import express from "express";
import cors from "cors";
import "dotenv/config";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());
app.use(express.json());

// API 설정
const API_KEY = process.env.GEMINI_API_KEY; // 사용자 환경 변수 사용
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// 응답 JSON 스키마 (AI가 출력해야 할 구조)
const JSON_SCHEMA = {
  type: "OBJECT",
  properties: {
    event_title: { type: "STRING" },
    d_day: { type: "STRING" },
    event_overview: { type: "STRING" },
    date_range: {
      type: "OBJECT",
      properties: {
        start_date: { type: "STRING" },
        end_date: { type: "STRING" },
        duration_days: { type: "NUMBER" }
      }
    },
    daily_hours: { type: "STRING" },
    reservation_info: {
      type: "OBJECT",
      properties: {
        open_date: { type: "STRING" },
        method: { type: "STRING" },
        requirements: { type: "STRING" }
      }
    },
    entrance_info: {
      type: "OBJECT",
      properties: {
        entry_time: { type: "STRING" },
        entry_items: {
          type: "ARRAY",
          items: { type: "STRING" }
        }
      }
    },
    event_contents: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" }
        }
      }
    },
    event_benefits: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    goods_list: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          goods_name: { type: "STRING" },
          price: { type: "STRING" }
        }
      }
    }
  },
  required: ["event_title", "event_overview", "date_range", "reservation_info"] // 필수 필드 지정
};

/**
 * 지수 백오프(Exponential Backoff)를 사용하여 API 호출을 재시도합니다.
 * 429 Too Many Requests 오류를 처리하기 위함입니다.
 */
async function generateContentWithRetry(prompt, maxRetries = 5) {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: JSON_SCHEMA,
    },
  };

  for (let i = 0; i < maxRetries; i++) {
    let delay = Math.pow(2, i) * 1000 + Math.random() * 1000; // 1s, 2s, 4s, 8s... + jitter

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 429) {
        console.log(`⚠️ 할당량 초과 (429). ${i + 1}번째 재시도. ${Math.round(delay / 1000)}초 후 재시도...`);
        
        // 서버에서 제공하는 Retry-After 헤더를 우선적으로 사용
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
            delay = parseInt(retryAfter) * 1000;
            console.log(`💡 서버 요청에 따라 ${retryAfter}초 후 재시도...`);
        }
        
        // 마지막 시도라면 재시도하지 않고 에러를 던집니다.
        if (i === maxRetries - 1) {
          throw new Error("최대 재시도 횟수 초과");
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // 다른 HTTP 에러 (400, 500 등)는 즉시 처리
        const errorText = await response.text();
        throw new Error(`API 요청 실패 (상태 코드: ${response.status}): ${errorText}`);
      }
    } catch (error) {
      if (error.message.includes('최대 재시도 횟수 초과')) {
        throw error; // 최종 에러 던지기
      }
      // 네트워크 오류 등 기타 오류 발생 시 다음 재시도까지 대기
      if (i === maxRetries - 1) {
        throw new Error(`최대 재시도 횟수 초과 후 최종 오류: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// 네이버 블로그 내용 크롤링
async function crawlNaverBlog(url) {
  let browser;
  try {
    console.log("🌐 브라우저 실행 중...");
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log("📄 페이지 로딩 중:", url);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // 잠시 대기 (iframe 로딩)
   await new Promise(resolve => setTimeout(resolve, 2000));
    
    // iframe 내용 가져오기
    const frames = page.frames();
    let content = "";
    
    console.log("🔍 iframe 개수:", frames.length);
    
    for (const frame of frames) {
      try {
        const frameContent = await frame.evaluate(() => {
          // 네이버 블로그 본문 선택자들
          const selectors = [
            '.se-main-container',
            '#postViewArea',
            '.se-component',
            '.post-view',
            '#content-area'
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              return element.innerText;
            }
          }
          
          return document.body.innerText;
        });
        
        if (frameContent && frameContent.length > content.length) {
          content = frameContent;
        }
      } catch (e) {
        console.log("⚠️ iframe 접근 실패:", e.message);
      }
    }
    
    // 메인 페이지 내용도 시도
    if (content.length < 100) {
      const mainContent = await page.evaluate(() => {
        return document.body.innerText;
      });
      
      if (mainContent.length > content.length) {
        content = mainContent;
      }
    }
    
    console.log("✅ 크롤링 완료! 내용 길이:", content.length);
    console.log("📝 내용 미리보기:", content.slice(0, 300).replace(/\n/g, ' '));
    
    return content || "내용을 가져올 수 없습니다.";
    
  } catch (error) {
    console.error("❌ 크롤링 오류:", error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log("🔒 브라우저 종료");
    }
  }
}

// /analyze POST
app.post("/analyze", async (req, res) => {
  try {
    console.log("📥 요청 받음!");
    console.log("📦 요청 body:", JSON.stringify(req.body));
    
    const { link } = req.body;
    
    if (!link) {
      console.log("❌ 링크가 없음");
      return res.status(400).json({ 
        success: false, 
        error: "네이버 블로그 링크가 필요합니다." 
      });
    }

    // 네이버 블로그 링크 검증
    if (!link.includes('blog.naver.com')) {
      return res.status(400).json({ 
        success: false, 
        error: "네이버 블로그 링크만 지원합니다." 
      });
    }

    console.log("🔗 링크:", link);

    // 1️⃣ 블로그 크롤링
    console.log("🚀 블로그 크롤링 시작...");
    const blogContent = await crawlNaverBlog(link);
    
    if (blogContent.length < 50) {
      throw new Error("블로그 내용을 충분히 가져오지 못했습니다.");
    }

    // 2️⃣ Gemini AI prompt 작성
    const systemInstruction = `당신은 행사 정보를 구조화하는 AI 비서입니다. 아래 네이버 블로그 게시글 내용을 분석하여 행사 정보를 추출하고 JSON 형식으로만 출력하세요. 블로그 내용에서 실제로 언급된 정보만 추출하고, 정보가 없는 항목은 JSON 스키마에 따라 빈 문자열("") 또는 빈 배열([])로 처리하세요. 다른 설명은 포함하지 마세요.`;

    const userPrompt = `블로그 게시글 내용:
${blogContent.slice(0, 10000)}`;


    // 3️⃣ Gemini AI 호출 (재시도 로직 사용)
    console.log("🤖 Gemini AI 분석 시작 (재시도 로직 적용)...");
    
    const result = await generateContentWithRetry(userPrompt);
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error("AI 응답에서 텍스트를 찾을 수 없습니다.");
    }

    console.log("✅ Gemini AI 응답 받음!");
    console.log("📄 응답 샘플:", text.slice(0, 200));

    // 4️⃣ JSON 파싱 (이미 JSON 출력이 강제되었으므로 파싱이 쉬움)
    let eventData;
    try {
      console.log("🔄 JSON 파싱 시도 중...");
      eventData = JSON.parse(text);
      console.log("✅ JSON 파싱 성공!");
    } catch (parseError) {
      console.error("❌ JSON 파싱 오류:", parseError.message);
      return res.status(500).json({ 
        success: false, 
        error: "AI 응답을 파싱할 수 없습니다.", 
        rawResponse: text 
      });
    }

    // 5️⃣ 결과 반환
    console.log("🎉 성공! 클라이언트로 전송");
    return res.json({ success: true, event: eventData });
    
  } catch (err) {
    console.error("❌ 서버 오류:", err.message);
    console.error("📚 스택:", err.stack);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

app.listen(4000, () => 
  console.log("✨ Gemini Event Server running on :4000")
);