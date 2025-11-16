import express from "express";
import cors from "cors";
import "dotenv/config";
import puppeteer from "puppeteer";
import multer from "multer";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 이미지 업로드를 위해 크기 제한 증가

// Multer 설정 (이미지 업로드)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB 제한
});

// API 설정
const API_KEY = process.env.GEMINI_API_KEY;
// 모델 이름을 안정적인 최신 버전으로 변경
const MODEL_NAME = "gemini-2.5-flash"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// 굿즈 정보 JSON 스키마
const GOODS_SCHEMA = {
  type: "OBJECT",
  properties: {
    goods_list: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          goods_name: { type: "STRING" },
          price: { type: "STRING" }
        }
      }
    },
    event_benefits: {
      type: "ARRAY",
      items: { type: "STRING" }
    }
  }
};

// 행사 정보 JSON 스키마
const EVENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    event_title: { type: "STRING" },
    official_link: { type: "STRING" },
    event_overview: {
      type: "OBJECT",
      properties: {
        address: { type: "STRING" },
        date_range: { type: "STRING" },
        duration_days: { type: "INTEGER" },
        daily_hours: { type: "STRING" }
      }
    },
    reservation_info: {
      type: "OBJECT",
      properties: {
        open_date: { type: "STRING" },
        method: { type: "STRING" },
        notes: { type: "STRING" }
      }
    },
    entrance_info: {
      type: "OBJECT",
      properties: {
        entry_time: { type: "STRING" },
        entry_method: { type: "STRING" },
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
    }
  },
  required: ["event_title", "official_link", "event_overview"]
};

/**
 * 지수 백오프를 사용한 API 재시도 (변경 없음)
 */
async function generateContentWithRetry(prompt, schema, imageParts = null, maxRetries = 5) {
  const contentParts = [];
  
  // 텍스트 프롬프트 추가
  if (prompt) {
    contentParts.push({ text: prompt });
  }
  
  // 이미지 추가 (있을 경우)
  if (imageParts && imageParts.length > 0) {
    contentParts.push(...imageParts);
  }

  const payload = {
    contents: [{ parts: contentParts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
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
 * 범용 웹 크롤러 - 모든 웹사이트 지원 (변경 없음)
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

// 네이버 블로그 전용 크롤러 (변경 없음)
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

// 티스토리 전용 크롤러 (변경 없음)
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

// 인스타그램 전용 크롤러 (변경 없음)
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

// 범용 크롤러 (모든 사이트) (변경 없음)
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

// /analyze POST - 링크 분석 (변경 없음)
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

    // 2️⃣ Gemini AI prompt 작성 (새로운 정책 적용)
    const userPrompt = `당신은 웹페이지에서 행사 정보를 구조적으로 분석하는 AI입니다.
아래 웹페이지 내용을 분석하여 다음 규칙에 따라 JSON 형식으로만 출력하세요.

[행사 정보 추출 정책]

1. **행사 개요**
   - 주소: "장소이름(도로명주소)" 형태로 표기.
   - 일시: YYYY-MM-DD HH:MM(요일) 형태로 표기.
   - 며칠간 진행되는 행사인지 계산하여 "duration_days"로 표기.
   - 일자별 운영시간을 "daily_hours" 객체로 표시. (없을 경우 null)

2. **예매정보**
   - 예약/예매일: YYYY-MM-DD HH:MM 형태로 표기.
   - 예약방법: [어디에서 / 어떻게] 형태로 표기. 예: "네이버예약 / 온라인 접수"
   - 예매 시 주의사항: 환불, 선착순, 예외사항 등 주기 단구를 모두 포함.

3. **입장안내**
   - 입장시간: 몇분 전부터 입장 시 운영 시작시간값을 입력.
   - 입장방식: 입장 프로세스 설명 (예: QR코드 입장, 현장확인 등)
   - 입장준비물: 본인확인 및 입장 시 필요한 물품 (예: 신분증, 예매확인증)

4. **행사 콘텐츠**
   - 각 콘텐츠를 {"title": "...", "description": "..."} 형식의 리스트로 표시.

5. **행사 특전**
   - "특전상품명_조건" 형태로 표시. 예: "한정판 굿즈_3만원 이상 구매 시"

---

웹페이지 내용:
${pageContent.slice(0, 10000)}

---

**출력 형식:**
반드시 위 JSON 구조만 반환하세요. 여분의 설명이나 문장은 절대 포함하지 마세요.`;

    // 3️⃣ Gemini AI 호출
    console.log("🤖 Gemini AI 분석 시작 (재시도 로직 적용)...");
    
    const result = await generateContentWithRetry(userPrompt, EVENT_SCHEMA);
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

// /analyze-image POST - 이미지 분석 (수정됨: 원본 이미지 배열 반환)
app.post("/analyze-image", async (req, res) => {
  try {
    console.log("📥 이미지 분석 요청 받음!");
    
    const { images } = req.body; // Base64 이미지 배열
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "최소 1개 이상의 이미지가 필요합니다." 
      });
    }

    console.log(`📸 받은 이미지 개수: ${images.length}`);

    // 이미지를 Gemini API 형식으로 변환
    const imageParts = images.map((img) => {
      // data:image/jpeg;base64,... 형식에서 base64 부분만 추출
      const base64Data = img.includes('base64,') 
        ? img.split('base64,')[1] 
        : img;
      
      // MIME 타입 추출
      const mimeType = img.match(/data:(image\/[a-z]+);base64/)?.[1] || 'image/jpeg';
      
      return {
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      };
    });

    // AI 프롬프트 작성
    const imagePrompt = `다음 이미지는 행사 관련 안내 이미지입니다.
이미지에서 '굿즈 목록'과 '행사 특전' 정보를 추출하세요.

[분석 목표]

1. **굿즈 목록**
   - 이미지에 등장하는 판매 굿즈를 식별
   - 각 굿즈의 대해 다음 정보를 JSON으로 정리:
     - 굿즈명: "XXXXX"
     - 가격: "15000원" (단위 포함)

2. **행사 특전**
   - 이미지에 적힌 "특전" 또는 "혜택" 정보를 추출
   - 각 특전을 다음 규칙으로 표시:
     - "특전 상품명_적용 조건" 형식
     - 예: "포토카드_3만원 이상 구매 시", "엽서세트_온라인 구매 시 증정"

⚠️ 주의사항:
- 이미지 내 텍스트를 가능한 한 정확히 인식하여 JSON에 포함
- 가격 정보가 없으면 null 또는 "" 표시
- 특전 조건이 명시되지 않은 경우 "조건 미기재"로 기입
- 굿즈나 특전이 없는 경우 빈 배열([])로 표시

**출력 형식:**
반드시 JSON 구조만 반환하세요. 다른 설명은 절대 포함하지 마세요.`;

    console.log("🤖 Gemini AI 이미지 분석 시작...");
    
    const result = await generateContentWithRetry(imagePrompt, GOODS_SCHEMA, imageParts);
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error("AI 응답에서 텍스트를 찾을 수 없습니다.");
    }

    console.log("✅ Gemini AI 이미지 분석 완료!");
    console.log("📄 응답 샘플:", text.slice(0, 200));

    // JSON 파싱
    let goodsData;
    try {
      console.log("🔄 JSON 파싱 시도 중...");
      goodsData = JSON.parse(text);
      console.log("✅ JSON 파싱 성공!");
    } catch (parseError) {
      console.error("❌ JSON 파싱 오류:", parseError.message);
      return res.status(500).json({ 
        success: false, 
        error: "AI 응답을 파싱할 수 없습니다.", 
        rawResponse: text 
      });
    }

    console.log("🎉 성공! 클라이언트로 전송");
    
    // **수정된 최종 반환: goods 데이터와 images(원본 Base64 배열)를 함께 반환합니다.**
    return res.json({ 
      success: true,
      goods: goodsData,
      uploaded_images: images // 프론트엔드에서 표시할 원본 이미지 배열
    });
    
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