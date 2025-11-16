import express from "express";
import cors from "cors";
import "dotenv/config";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());
app.use(express.json());

// API 설정
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// 응답 JSON 스키마
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
  required: ["event_title", "event_overview", "date_range", "reservation_info"]
};

/**
 * 지수 백오프를 사용한 API 재시도
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
    let delay = Math.pow(2, i) * 1000 + Math.random() * 1000;

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
        
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
            delay = parseInt(retryAfter) * 1000;
            console.log(`💡 서버 요청에 따라 ${retryAfter}초 후 재시도...`);
        }
        
        if (i === maxRetries - 1) {
          throw new Error("최대 재시도 횟수 초과");
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        const errorText = await response.text();
        throw new Error(`API 요청 실패 (상태 코드: ${response.status}): ${errorText}`);
      }
    } catch (error) {
      if (error.message.includes('최대 재시도 횟수 초과')) {
        throw error;
      }
      if (i === maxRetries - 1) {
        throw new Error(`최대 재시도 횟수 초과 후 최종 오류: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * 범용 웹 크롤러 - 모든 웹사이트 지원
 */
async function crawlWebPage(url) {
  let browser;
  try {
    console.log("🌐 브라우저 실행 중...");
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log("📄 페이지 로딩 중:", url);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // 페이지 로딩 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let content = "";
    
    // 사이트별 전략 선택
    if (url.includes('blog.naver.com')) {
      console.log("🔍 네이버 블로그 전략 사용");
      content = await crawlNaverBlog(page);
    } else if (url.includes('tistory.com')) {
      console.log("🔍 티스토리 전략 사용");
      content = await crawlTistory(page);
    } else if (url.includes('instagram.com')) {
      console.log("🔍 인스타그램 전략 사용");
      content = await crawlInstagram(page);
    } else {
      console.log("🔍 범용 크롤링 전략 사용");
      content = await crawlGeneric(page);
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

// 네이버 블로그 전용 크롤러
async function crawlNaverBlog(page) {
  const frames = page.frames();
  let content = "";
  
  for (const frame of frames) {
    try {
      const frameContent = await frame.evaluate(() => {
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
  
  return content;
}

// 티스토리 전용 크롤러
async function crawlTistory(page) {
  return await page.evaluate(() => {
    const selectors = [
      '.article-view',
      '.entry-content',
      '#content',
      'article',
      '.tt_article_useless_p_margin'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.innerText;
      }
    }
    
    return document.body.innerText;
  });
}

// 인스타그램 전용 크롤러
async function crawlInstagram(page) {
  return await page.evaluate(() => {
    const selectors = [
      'article div[role="button"] span',
      'article h1',
      'article span',
      '[class*="Caption"]'
    ];
    
    let content = "";
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.innerText || el.textContent;
        if (text && text.length > 10) {
          content += text + "\n";
        }
      });
    }
    
    return content || document.body.innerText;
  });
}

// 범용 크롤러 (모든 사이트)
async function crawlGeneric(page) {
  return await page.evaluate(() => {
    // 광고, 메뉴, 푸터 등 불필요한 요소 제거
    const unwantedSelectors = [
      'nav', 'header', 'footer', 
      '.advertisement', '.ad', '.banner',
      '[class*="sidebar"]', '[class*="menu"]',
      'script', 'style', 'iframe'
    ];
    
    unwantedSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    // 본문 우선 선택자
    const mainSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '#content',
      '.main-content'
    ];
    
    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.length > 100) {
        return element.innerText;
      }
    }
    
    // 마지막 대안: body 전체
    return document.body.innerText;
  });
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
        error: "웹페이지 링크가 필요합니다." 
      });
    }

    // URL 유효성 검증
    try {
      new URL(link);
    } catch (e) {
      return res.status(400).json({ 
        success: false, 
        error: "유효하지 않은 URL입니다." 
      });
    }

    console.log("🔗 링크:", link);

    // 1️⃣ 웹페이지 크롤링
    console.log("🚀 웹페이지 크롤링 시작...");
    const pageContent = await crawlWebPage(link);
    
    if (pageContent.length < 50) {
      throw new Error("웹페이지 내용을 충분히 가져오지 못했습니다.");
    }

    // 2️⃣ Gemini AI prompt 작성
    const userPrompt = `웹페이지 내용:
${pageContent.slice(0, 10000)}`;

    // 3️⃣ Gemini AI 호출
    console.log("🤖 Gemini AI 분석 시작 (재시도 로직 적용)...");
    
    const result = await generateContentWithRetry(userPrompt);
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error("AI 응답에서 텍스트를 찾을 수 없습니다.");
    }

    console.log("✅ Gemini AI 응답 받음!");
    console.log("📄 응답 샘플:", text.slice(0, 200));

    // 4️⃣ JSON 파싱
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
  console.log("✨ Universal Web Crawler Server running on :4000")
);