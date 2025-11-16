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

// 1. ⚠️ API 키 로드 및 유효성 검사 추가 ⚠️
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
    console.error("API 키가 포함된 .env 파일을 서버 폴더에 생성했는지 확인하세요.");
    // API 키 없으면 서버 실행 중단
    process.exit(1); 
}

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

// =========================================================
// 💡 추가된 과거 유사 행사 검색 스키마
// =========================================================
const PAST_EVENT_SCHEMA = {
    type: "OBJECT",
    properties: {
        // 검색된 유사 행사 목록 (사용자에게 링크 제공)
        past_events_list: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" }, // 과거 행사명
                    link: { type: "STRING" }   // 과거 행사 관련 검색 결과 링크
                }
            }
        },
        feedback: {
            type: "OBJECT",
            properties: {
                goods: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            title: { type: "STRING" }, 
                            description: { type: "STRING" }
                        }
                    }
                },
                contents: {
                    type: "OBJECT",
                    properties: {
                        positive: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    title: { type: "STRING" }, 
                                    description: { type: "STRING" }
                                }
                            }
                        },
                        negative: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    title: { type: "STRING" }, 
                                    description: { type: "STRING" }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    required: ["past_events_list", "feedback"]
};


/**
 * 지수 백오프를 사용한 API 재시도 (재수정됨: API 명세에 맞는 필드 이름 사용)
 */
// tools 매개변수가 추가되었고, API 요청 본문(payload)에 올바르게 포함됩니다.
async function generateContentWithRetry(prompt, schema, imageParts = null, tools = null, maxRetries = 5) {
    const contentParts = [];
    
    // 텍스트 프롬프트 추가
    if (prompt) {
        contentParts.push({ text: prompt });
    }
    
    // 이미지 추가 (있을 경우)
    if (imageParts && imageParts.length > 0) {
        contentParts.push(...imageParts);
    }

    // 페이로드 기본 구성: contents는 필수
    const payload = {
        contents: [{ parts: contentParts }],
    };

    // API 요청의 'config' 필드를 'generationConfig'로 수정
    payload.generationConfig = {
        responseMimeType: "application/json",
        responseSchema: schema,
    };

    // tools (검색 도구) 설정이 있을 경우, payload의 최상위 레벨에 'tools' 필드를 추가
    // Generative Language API는 `tools`를 최상위 필드로 받습니다.
    if (tools) {
        payload.tools = tools; 
        console.log("🛠️ Tool 설정 적용:", tools);
    }
    
    //console.log("⚙️ 최종 API 페이로드:", JSON.stringify(payload, null, 2).slice(0, 500)); // 디버깅용

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
                // API 키 관련 400 에러도 여기서 명확히 잡힙니다.
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
        // Canvas 환경에서 Puppeteer를 실행하기 위한 안전한 설정
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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
        
        // 링크 분석은 검색 도구가 필요하지 않으므로 tools는 null로 전달
        const result = await generateContentWithRetry(userPrompt, EVENT_SCHEMA, null, null);
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

// /analyze-image POST - 이미지 분석 (변경 없음)
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
        
        // 이미지 분석은 검색 도구가 필요하지 않으므로 tools는 null로 전달
        const result = await generateContentWithRetry(imagePrompt, GOODS_SCHEMA, imageParts, null);
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

// =========================================================
// 💡 수정된 과거 유사 행사 검색 API (Google Search Tool 활성화)
// =========================================================
app.post("/search-past-events", async (req, res) => {
  try {
      console.log("📥 과거 유사 행사 검색 요청 받음!");
      const { event_title } = req.body;

      if (!event_title) {
          return res.status(400).json({ 
              success: false, 
              error: "행사 제목(event_title)이 필요합니다." 
          });
      }

      // 1️⃣ AI 프롬프트 작성 (실제 검색 및 분석 요청)
      const pastEventPrompt = `당신은 주어진 행사 제목과 유사한 과거 행사를 인터넷에서 검색하고, 해당 행사의 운영 및 굿즈 구매 관련 후기를 분석하여 구조적으로 정리하는 AI입니다.

**'${event_title}'**과 같은 종류의 행사(예: '아이돌 팝업', '특정 브랜드 마켓', '지역 축제' 등)에 대해 **실제 검색을 수행**하고 다음 규칙에 따라 **JSON 형식으로만** 출력하세요.

[분석 및 정리 정책]

1. **과거 유사 행사 목록 (past_events_list)**
  - '${event_title}'과 유사한 제목의 **실제 과거 행사 3~4개를 검색**하여 목록을 생성하세요.
  - 각 항목은 "title"과 해당 행사에 대한 **실제 정보가 담긴 "link"**를 포함해야 합니다. (예: 블로그 후기, 공식 공지 등)
  
2. **피드백 (feedback)**
  - 검색된 과거 행사의 **실제 후기들을 종합적으로 분석**하여 다음과 같이 정리하세요:

  a. **굿즈 구매 관련 (goods):**
      - 굿즈 구매 줄, 대기 운영 방식에 대한 의견만 포함.
      - **재고, 품절 시점 등 상품 자체에 대한 정보는 제외**하세요.
      - 결과는 [{설명에 대한 소제목} : {설명}]의 형태로 return.
      
  b. **행사 전반 관련 (contents):**
      - 굿즈를 제외한 운영 전반에 대한 반응을 긍정(positive)과 부정(negative)으로 구분하세요.
      - 결과는 [{설명에 대한 소제목} : {설명}]의 형태로 return.

⚠️ 주의사항:
- 모든 "description"은 한글로 작성되어야 합니다.
- **실제 인터넷 검색 결과를 바탕으로 분석**을 수행해야 합니다.
- 응답은 반드시 아래 정의된 JSON 구조만 반환해야 합니다.

**행사 제목:** ${event_title}

**출력 형식:**
반드시 위 JSON 구조만 반환하세요. 여분의 설명이나 문장은 절대 포함하지 마세요.`;

      // 2️⃣ Gemini AI 호출
      console.log("🤖 Gemini AI 과거 행사 분석 시작 (실제 검색 요청)...");
      
      // Google Search Tool을 tools 인수로 명시적으로 전달합니다.
      const toolsConfig = [{ googleSearch: {} }];
      
      // generateContentWithRetry 함수에 toolsConfig를 4번째 인수로 전달합니다.
      const result = await generateContentWithRetry(pastEventPrompt, PAST_EVENT_SCHEMA, null, toolsConfig);
          
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
          throw new Error("AI 응답에서 텍스트를 찾을 수 없습니다.");
      }

      console.log("✅ Gemini AI 과거 행사 응답 받음!");

      // 3️⃣ JSON 파싱
      let pastEventData;
      try {
          console.log("🔄 JSON 파싱 시도 중...");
          pastEventData = JSON.parse(text);
          console.log("✅ JSON 파싱 성공!");
      } catch (parseError) {
          console.error("❌ JSON 파싱 오류:", parseError.message);
          return res.status(500).json({ 
              success: false, 
              error: "AI 응답을 파싱할 수 없습니다.", 
              rawResponse: text 
          });
      }

      // 4️⃣ 결과 반환
      console.log("🎉 성공! 과거 행사 데이터 클라이언트로 전송");
      return res.json({ success: true, pastEvents: pastEventData });

  } catch (err) {
      console.error("❌ 서버 오류:", err.message);
      return res.status(500).json({ 
          success: false, 
          error: err.message 
      });
  }
});

app.listen(4000, () => 
    console.log("✨ Universal Web Crawler Server running on :4000")
);