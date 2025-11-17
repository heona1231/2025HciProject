import express from "express";
import cors from "cors";
import "dotenv/config";
import puppeteer from "puppeteer";
import { createWorker } from 'tesseract.js';
import multer from "multer";
import fs from "fs";
import { type } from "os";

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 이미지 업로드를 위해 크기 제한 증가

// Multer 설정 (이미지 업로드)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB 제한
});

// multer 에러 핸들러
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('❌ Multer 에러:', err.message);
        return res.status(400).json({ success: false, error: `파일 업로드 오류: ${err.message}` });
    }
    next();
});// 1. ⚠️ API 키 로드 및 유효성 검사 추가 ⚠️
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
                    price: { type: "STRING" },
                    image_index: { type: "INTEGER" }
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
        console.log(`📌 이미지 파트 추가: ${imageParts.length}개`);
        contentParts.push(...imageParts);
    }

    // 페이로드 기본 구성: contents는 필수
    const payload = {
        contents: [{ parts: contentParts }],
    };

    // API 요청의 'generationConfig'
    // Note: when using external tools (e.g., googleSearch) the API may not support
    // a binary/json responseMimeType together with tools. In that case request
    // plain text and parse JSON from the returned text.
    if (tools) {
        payload.generationConfig = {
            responseMimeType: "text/plain",
        };
        console.log('🔧 tools detected — using text/plain responseMimeType to maintain compatibility with tools');
    } else {
        payload.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: schema,
        };
    }

    // tools (검색 도구) 설정이 있을 경우, payload의 최상위 레벨에 'tools' 필드를 추가
    // Generative Language API는 `tools`를 최상위 필드로 받습니다.
    if (tools) {
        payload.tools = tools; 
        console.log("🛠️ Tool 설정 적용:", tools);
    }
    
    console.log(`📊 Payload 정보: parts=${payload.contents[0].parts.length}, schemaType=${schema.type}`);

    for (let i = 0; i < maxRetries; i++) {
        let delay = Math.pow(2, i) * 1000 + Math.random() * 1000;

        try {
            console.log(`🔌 Gemini API 호출 시도 (${i + 1}/${maxRetries})...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60초 타임아웃
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (response.ok) {
                console.log('✅ Gemini API 응답 성공');
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
                console.error(`❌ API 오류 (상태 ${response.status}):`, errorText.slice(0, 300));
                throw new Error(`API 요청 실패 (상태 코드: ${response.status}): ${errorText}`);
            }
        } catch (error) {
            if (error instanceof TypeError && error.message === 'Failed to fetch') {
                console.error('❌ 네트워크 오류 (타임아웃?):', error.message);
            }
            if (error.message.includes('최대 재시도 횟수 초과')) {
                throw error;
            }
            if (i === maxRetries - 1) {
                throw new Error(`최대 재시도 횟수 초과 후 최종 오류: ${error.message}`);
            }
            console.log(`⚠️ 오류 발생, ${Math.round(delay / 1000)}초 후 재시도...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}/**
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


// Helper: try to extract a JSON object from free-form text returned by the model
function extractJsonFromText(text) {
    if (!text || typeof text !== 'string') return null;
    // Quick bracket search: find first '{' and then find matching '}' by scanning
    const start = text.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;

        if (depth === 0) {
            const candidate = text.slice(start, i + 1);
            try {
                return JSON.parse(candidate);
            } catch (e) {
                // fallthrough and continue searching for later balanced object
            }
        }
    }

    // fallback: try a naive regex approach to pull {...}
    const braceMatch = text.match(/\{[\s\S]*\}/m);
    if (braceMatch) {
        try {
            return JSON.parse(braceMatch[0]);
        } catch (e) {
            return null;
        }
    }

    return null;
}
// OCR 단계 스킵
const ocrText = "";

// OCR: base64 이미지에서 텍스트 추출 (tesseract.js)
// async function extractTextFromBase64(base64Data) {
//     try {
//         const worker = await createWorker(); // logger 제거
//         await worker.load();
//         try {
//             await worker.loadLanguage('kor+eng');
//             await worker.initialize('kor+eng');
//         } catch {
//             await worker.loadLanguage('eng');
//             await worker.initialize('eng');
//         }

//         const buffer = Buffer.from(base64Data, 'base64');
//         const { data: { text } } = await worker.recognize(buffer);
//         await worker.terminate();
//         return text;
//     } catch (err) {
//         console.error('OCR 오류:', err.message || err);
//         return '';
//     }
// }

// 간단한 OCR 텍스트 기반 굿즈/특전 파서 (휴리스틱)
function parseGoodsAndBenefitsFromOCR(ocrText) {
    const lines = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const goods_list = [];
    const event_benefits = [];

    const priceRegex = /(\d{1,3}(?:[,\d]{0,3})*원|\d+원)/; // 예: 15,000원 또는 15000원

    const benefitKeywords = ['증정', '특전', '혜택', '사은품', '증정합니다', '증정)'];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1) 가격이 포함된 라인은 굿즈 후보
        const priceMatch = line.match(priceRegex);
        if (priceMatch) {
            const price = priceMatch[0];
            // 상품명은 가격 앞쪽 텍스트를 사용
            let name = line.replace(price, '').replace(/[-:\|•\*]/g, '').trim();
            // 만약 이름이 짧으면 이전 라인과 결합 시도
            if (!name || name.length < 2) {
                const prev = lines[i - 1];
                if (prev && prev.length > name.length) {
                    name = (prev + ' ' + name).trim();
                }
            }
            goods_list.push({ goods_name: name || '상품', price });
            continue;
        }

        // 2) 특전 키워드가 포함된 라인
        for (const kw of benefitKeywords) {
            if (line.includes(kw)) {
                // 기본적으로 '상품_조건' 형태로 만들기
                // '_' 이미 있으면 그대로 사용
                if (line.includes('_')) {
                    event_benefits.push(line);
                } else {
                    // 가능한 경우: "포토카드 3만원 이상 구매 시 증정"
                    // 상품명: 첫 단어 그룹, 조건: 나머지
                    const parts = line.split(/\s{1,}|,|:/).map(p => p.trim()).filter(Boolean);
                    if (parts.length >= 2) {
                        const name = parts[0];
                        const cond = parts.slice(1).join(' ');
                        event_benefits.push(`${name}_${cond}`);
                    } else {
                        event_benefits.push(`${line}_조건 미표기`);
                    }
                }
                break;
            }
        }
    }

    // 중복 제거
    const uniqGoods = [];
    const seen = new Set();
    for (const g of goods_list) {
        const key = `${g.goods_name}|${g.price}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqGoods.push(g);
        }
    }

    const uniqBenefits = Array.from(new Set(event_benefits));

    return { goods_list: uniqGoods, event_benefits: uniqBenefits };
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

// Health check
app.get("/health", (req, res) => {
    console.log("✅ Health check OK");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

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

// /analyze-image POST - 이미지 분석 (JSON body base64 또는 multipart 업로드)
app.post("/analyze-image", async (req, res) => {
    try {
        console.log("📥 이미지 분석 요청 받음!");
        console.log("📦 req.body:", JSON.stringify(req.body).slice(0, 100));
        
        const { images } = req.body; // Base64 이미지 배열
        
        if (!images || !Array.isArray(images) || images.length === 0) {
            console.error("❌ 이미지 배열이 없거나 비어있음");
            return res.status(400).json({ 
                success: false, 
                error: "최소 1개 이상의 이미지가 필요합니다." 
            });
        }

        console.log(`📸 받은 이미지 개수: ${images.length}`);

        // TEST MODE: 환경 변수로 즉시 더미 데이터 반환 가능
        if (process.env.TEST_MODE === 'true') {
            console.log('🧪 TEST MODE: 더미 데이터 반환');
            const normalized = {
                goods_list: [
                    { goods_name: "테스트 굿즈 1", price: "10000원" },
                    { goods_name: "테스트 굿즈 2", price: "15000원" }
                ],
                event_benefits: [
                    "포토카드_구매 시 증정",
                    "엽서세트_이벤트 참여 시"
                ]
            };
            console.log('🎉 성공! 클라이언트로 전송 (테스트 모드)');
            return res.json({ success: true, goods: normalized, uploaded_images: images });
        }

        // ⚠️ blob: URL 검사 - 클라이언트 내부 참조는 서버에서 처리 불가
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (typeof img === 'string' && img.startsWith('blob:')) {
                console.error("❌ blob: URL 감지됨:", img.slice(0, 50));
                return res.status(400).json({
                    success: false,
                    error: "이미지 데이터 오류: blob: URL을 감지했습니다.\n\n권장 해결 방법:\n1. 파일 업로드 사용: POST /analyze-image-upload (multipart/form-data)\n2. 또는 이미지를 base64 data URI로 변환한 후 전송 (예: 'data:image/jpeg;base64,...')"
                });
            }
        }

        // 이미지를 Gemini API 형식으로 변환
        const imageParts = images.map((img) => {
            // data:image/jpeg;base64,... 형식에서 base64 부분만 추출
            const base64Data = (typeof img === 'string' && img.includes('base64,')) 
                ? img.split('base64,')[1] 
                : img;
            
            // MIME 타입 추출
            const mimeType = (typeof img === 'string' && img.match(/data:(image\/[a-z]+);base64/))
                ? img.match(/data:(image\/[a-z]+);base64/)?.[1]
                : 'image/jpeg';
            
            return {
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            };
                });

                // AI 프롬프트 작성 (사용자 제공 템플릿) - let으로 선언해 OCR 텍스트를 덧붙일 수 있게 함
                let imagePrompt = `다음 이미지는 행사 관련 안내 이미지입니다.
이미지 속에서 '굿즈 목록'과 '행사 특전'을 분석하여 아래 JSON 형식으로 반환하세요.

🎨 분석 목표
1. 굿즈 목록
     - 이미지에 등장하는 판매 굿즈(상품)를 식별
     - 각 굿즈에 대해 다음 정보를 JSON으로 정리
         - 굿즈명: 한글, 영어, 특수문자 모두 허용
         - 가격: "XXXXX원" 형식 (단위 포함)

2. 행사 특전
     - 이미지에 적힌 “특전” 또는 “혜택” 정보를 추출
     - 각 특전을 다음 규칙에 따라 JSON에 포함
         - "특전 상품명_해당 특전을 받기 위한 조건" 형식
             예: "포토카드_3만원 이상 구매 시 증정", "엽서세트_음료 구매 시 증정"

📦 출력 형식(JSON)
{
    "goods_list": [
        {
            "굿즈명": "문구세트",
            "가격": "15000원"
        }
    ],
    "event_benefits": [
        "포토카드_3만원 이상 구매 시 증정",
        "엽서세트_음료 구매 시 증정"
    ]
}

⚠️ 주의사항
- 이미지 내 텍스트를 가능한 한 정확히 인식하여 굿즈명 및 특전 조건을 추출합니다.
- 가격 정보가 없으면 null 또는 ""로 표시합니다.
- 특전 조건이 명시되지 않은 경우, “조건 미표기”로 기입합니다.
- 굿즈사진은 원본 전체 이미지를 그대로 넣고, 잘라내거나 변경하지 않습니다.

`;

                // OCR 보조: 이미지에서 텍스트를 추출하여 프롬프트에 추가 (더 정확한 추출을 위해)
                try {
                        console.log('🔎 OCR (JSON-path) 시작...');
                        const ocrResults = await Promise.all(images.map(img => {
                                const base64Data = (typeof img === 'string' && img.includes('base64,')) ? img.split('base64,')[1] : img;
                                return extractTextFromBase64(base64Data);
                        }));
                        const joinedOcr = ocrResults.filter(Boolean).join('\n\n');
                        if (joinedOcr.length > 0) {
                                console.log('🔎 OCR 추출 텍스트 샘플:', joinedOcr.slice(0, 300).replace(/\n/g, ' '));
                                imagePrompt += `\n\n이미지에서 추출한 텍스트:\n${joinedOcr}`;
                        } else {
                                console.log('🔎 OCR 결과 없음 - 텍스트 미추출');
                        }
                } catch (ocrErr) {
                        console.error('🔎 OCR 처리 중 오류:', ocrErr.message || ocrErr);
                }

    console.log("🤖 Gemini AI 이미지 분석 시작...");

    // 이미지 분석은 검색 도구가 필요하지 않으므로 tools는 null로 전달
    let result, text;
    try {
        result = await generateContentWithRetry(imagePrompt, GOODS_SCHEMA, imageParts, null);
        text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (aiErr) {
        console.error('⚠️ Gemini AI 호출 실패:', aiErr.message);
        // Fallback: 테스트용 더미 데이터 반환 (개발/테스트용)
        if (process.env.ALLOW_TEST_FALLBACK === 'true') {
            console.log('🔁 테스트 폴백 모드 활성화 - 더미 데이터로 응답');
            text = JSON.stringify({
                goods_list: [
                    { goods_name: "테스트 굿즈 1", price: "10000원" },
                    { goods_name: "테스트 굿즈 2", price: "15000원" }
                ],
                event_benefits: [
                    "포토카드_구매 시 증정",
                    "엽서세트_이벤트 참여 시"
                ]
            });
        } else {
            throw aiErr;
        }
    }

    if (!text) {
        throw new Error("AI 응답에서 텍스트를 찾을 수 없습니다.");
    }

    console.log("✅ Gemini AI 이미지 분석 완료!");
    console.log("📄 응답 샘플:", text.slice(0, 200));

    // JSON 파싱 및 OCR 보완 플로우
    let goodsData;
    try {
        try {
            goodsData = JSON.parse(text);
        } catch (e) {
            const extracted = extractJsonFromText(text);
            if (extracted) goodsData = extracted;
            else throw e;
        }
    } catch (parseError) {
        console.warn('⚠️ 직접 파싱 실패, OCR 보완 시도:', parseError.message);
        // OCR 기반 파서를 시도
        try {
            const ocrResults = await Promise.all(images.map(img => {
                const base64Data = (typeof img === 'string' && img.includes('base64,')) ? img.split('base64,')[1] : img;
                return extractTextFromBase64(base64Data);
            }));
            const joined = ocrResults.filter(Boolean).join('\n\n');
            const fallback = parseGoodsAndBenefitsFromOCR(joined);
            goodsData = { goods_list: fallback.goods_list || [], event_benefits: fallback.event_benefits || [] };
            console.log('🔁 OCR 휴리스틱으로 대체 결과 생성');
        } catch (ocrErr) {
            console.error('❌ OCR 보완 실패:', ocrErr.message || ocrErr);
            return res.status(500).json({ success: false, error: 'AI 응답을 파싱할 수 없습니다.', rawResponse: text });
        }
    }

    // 정규화: goods_list, event_benefits 보장
    const normalized = {
        goods_list: Array.isArray(goodsData.goods_list) ? goodsData.goods_list : (goodsData.goods || []),
        event_benefits: Array.isArray(goodsData.event_benefits) ? goodsData.event_benefits : (goodsData.event_benefits || goodsData.eventBenefits || [])
    };

    console.log('🎉 성공! 클라이언트로 전송 (이미지 분석)');
    // 서버 측에서 정규화된 결과 로깅 (base64 같은 큰 데이터는 제외하고 요약만 출력)
    try {
        console.log('🔔 이미지 분석 결과(정규화):', JSON.stringify({ goods_list: normalized.goods_list, event_benefits: normalized.event_benefits }, null, 2));
        console.log('🔔 업로드된 이미지 개수:', Array.isArray(images) ? images.length : 0);
    } catch (logErr) {
        console.warn('🔔 이미지 결과 로깅 중 오류:', logErr && logErr.message ? logErr.message : logErr);
    }

    return res.json({ success: true, goods: normalized, uploaded_images: images });
        
    } catch (err) {
        console.error("❌ 서버 오류:", err.message);
        console.error("📚 스택:", err.stack);
        return res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// ---------------------------------------------------------
// POST /analyze-image-upload - 이미지 파일 업로드 처리 (multipart/form-data)
// 클라이언트에서 파일 필드 이름을 `images`로 전송해야 합니다.
// ---------------------------------------------------------
    app.post('/analyze-image-upload', upload.array('images'), async (req, res) => {
    try {
        console.log('📥 파일 업로드 이미지 분석 요청 받음!');
        console.log('📋 요청 헤더:', {
            contentType: req.get('content-type'),
            contentLength: req.get('content-length')
        });
        console.log('📦 req.body:', req.body);
        console.log('📂 req.files:', req.files ? `${req.files.length}개 파일` : '없음');
        console.log('🔍 req.file:', req.file ? '단일 파일 존재' : '없음');
        
        const files = req.files;
        
        if (!files || !Array.isArray(files) || files.length === 0) {
            console.error('❌ 파일 없음');
            return res.status(400).json({ success: false, error: '최소 1개 이상의 이미지 파일이 필요합니다.' });
        }
        
        console.log(`📸 받은 파일 개수: ${files.length}`);
        files.forEach((file, idx) => {
            console.log(`   파일 ${idx + 1}: ${file.originalname} (${file.mimetype}, ${file.buffer.length} bytes)`);
        });
        
        // 파일들을 Gemini API 형식으로 변환
        console.log('🔄 Base64 변환 시작...');
        const imageParts = files.map((file, idx) => {
            const base64Data = file.buffer.toString('base64');
            const mimeType = file.mimetype || 'image/jpeg';
            console.log(`   이미지 ${idx + 1}: MIME=${mimeType}, Base64 길이=${base64Data.length}`);
            return {
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            };
        });
        // 원본 이미지를 프론트용으로 data URI 형태로 보관
        const uploadedBase64Uris = files.map((file) => `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`);

        // AI 프롬프트 (이미지 분석 목적)
        // AI 프롬프트 작성
let imagePrompt = `다음 이미지는 행사 관련 안내 이미지입니다.
이미지 속에서 '굿즈 목록'과 '행사 특전'을 분석하여 아래 JSON 형식으로 반환하세요.

🎨 분석 목표
1. 굿즈 목록
     - 이미지에 등장하는 판매 굿즈(상품)를 식별
     - 각 굿즈에 대해 다음 정보를 JSON으로 정리
         - goods_name: 한글, 영어, 특수문자 모두 허용
         - price: "XXXXX원" 형식 (단위 포함)
         - image_index: 해당 굿즈가 추출된 이미지 번호 (0부터 시작, 예: 0, 1, 2)

2. 행사 특전
     - 이미지에 적힌 "특전" 또는 "혜택" 정보를 추출
     - 각 특전을 다음 규칙에 따라 JSON에 포함
         - "특전 상품명_해당 특전을 받기 위한 조건" 형식
             예: "포토카드_3만원 이상 구매 시 증정", "엽서세트_음료 구매 시 증정"

📦 출력 형식(JSON)
{
    "goods_list": [
        {
            "goods_name": "문구세트",
            "price": "15000원",
            "image_index": 0
        },
        {
            "goods_name": "키링",
            "price": "8000원",
            "image_index": 1
        }
    ],
    "event_benefits": [
        "포토카드_3만원 이상 구매 시 증정",
        "엽서세트_음료 구매 시 증정"
    ]
}

⚠️ 주의사항 (재수정됨: 적극적인 인덱스 사용 명령)
- 이미지 내 텍스트를 가능한 한 정확히 인식하여 굿즈명 및 특전 조건을 추출합니다.
- 가격 정보가 없으면 null 또는 ""로 표시합니다.
- 특전 조건이 명시되지 않은 경우, "조건 미표기"로 기입합니다.
- image_index는 **해당 굿즈가 어느 이미지에서 추출되었는지**를 나타내는 **소스 이미지 번호**입니다.

- **🔥 최우선 명령 🔥:** 여러 개의 이미지가 업로드된 경우, **반드시 각 굿즈가 속한 이미지를 분석하여 해당 인덱스(0, 1, ...)를 정확하게 부여해야 합니다.** 모든 굿즈에 0만 할당하는 것은 분석 실패로 간주됩니다.
- **만약 2개의 이미지가 업로드된 경우, 굿즈가 1번 이미지에서 발견되었다면 image_index는 반드시 1이 되어야 합니다.** (0과 1 외의 다른 숫자는 사용 불가능합니다.)
- image_index는 절대 굿즈의 순번(1번째 굿즈는 0, 2번째 굿즈는 1...)으로 사용해서는 안 됩니다.
- 이미지가 1개만 있을 경우 모든 굿즈의 image_index는 0입니다.
`;
      console.log('🤖 Gemini AI 이미지 분석 시작 (파일 업로드 버전)...');
        console.log(`   프롬프트 길이: ${imagePrompt.length}`);
        console.log(`   이미지 파트 개수: ${imageParts.length}`);

        // OCR 보조: 이미지에서 텍스트를 추출하여 프롬프트에 추가
        let ocrText = '';
        try {
            console.log('🔎 OCR 시작 (파일 업로드 버전)...');
            const ocrResults = await Promise.all(files.map(f => {
                const b64 = f.buffer.toString('base64');
                return extractTextFromBase64(b64);
            }));
            ocrText = ocrResults.filter(Boolean).join('\n\n');
            if (ocrText.length > 0) console.log('🔎 OCR 추출 텍스트 샘플:', ocrText.slice(0, 300).replace(/\n/g, ' '));
        } catch (e) {
            console.warn('🔎 OCR 실패:', e.message || e);
        }

        // AI 호출: 이미지 + OCR 텍스트를 함께 전달하여 JSON을 생성하도록 요청
        try {
            let promptForAi = imagePrompt;
            if (ocrText && ocrText.length > 0) promptForAi += `\n\n이미지에서 추출한 텍스트:\n${ocrText}`;

            console.log('🤖 Gemini AI 이미지 분석 시작 (파일 업로드, AI 호출)...');
            
            // 🔥 이미지가 포함된 요청은 responseSchema 대신 text/plain으로 처리
            const payload = {
                contents: [{ 
                    parts: [
                        { text: promptForAi },  // OCR 텍스트가 포함된 프롬프트 사용
                        ...imageParts
                    ]
                }],
                generationConfig: {
                    responseMimeType: "text/plain",
                    temperature: 0.2
                }
            };
            
            console.log("🔌 Gemini API 직접 호출 (이미지 + text/plain)...");
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API 요청 실패: ${errorText}`);
            }
            
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!text) throw new Error('AI 응답에서 텍스트를 찾을 수 없습니다.');

            console.log('✅ Gemini AI 응답 받음 (파일 업로드)');

            // JSON 파싱 및 정규화
            let goodsData;
            try {
                try {
                    goodsData = JSON.parse(text);
                } catch (e) {
                    const extracted = extractJsonFromText(text);
                    if (extracted) goodsData = extracted;
                    else throw e;
                }
            } catch (parseError) {
                console.error('❌ JSON 파싱 오류:', parseError.message);
                // OCR 휴리스틱으로 대체
                try {
                    const fallback = parseGoodsAndBenefitsFromOCR(ocrText);
                    goodsData = { goods_list: fallback.goods_list || [], event_benefits: fallback.event_benefits || [] };
                    console.log('🔁 OCR 휴리스틱으로 대체 결과 생성');
                } catch (fallbackErr) {
                    return res.status(500).json({ success: false, error: 'AI 응답을 파싱할 수 없습니다.', rawResponse: text });
                }
            }

            const normalizedGoods = {
                goods_list: Array.isArray(goodsData.goods_list) ? goodsData.goods_list : (goodsData.goods || []),
                event_benefits: Array.isArray(goodsData.event_benefits) ? goodsData.event_benefits : (goodsData.event_benefits || goodsData.eventBenefits || [])
            };

            // If still empty, try OCR fallback parser again
            if ((!Array.isArray(normalizedGoods.goods_list) || normalizedGoods.goods_list.length === 0) && (!Array.isArray(normalizedGoods.event_benefits) || normalizedGoods.event_benefits.length === 0)) {
                try {
                    const fallback = parseGoodsAndBenefitsFromOCR(ocrText);
                    if (fallback.goods_list && fallback.goods_list.length > 0) normalizedGoods.goods_list = fallback.goods_list;
                    if (fallback.event_benefits && fallback.event_benefits.length > 0) normalizedGoods.event_benefits = fallback.event_benefits;
                    if ((normalizedGoods.goods_list && normalizedGoods.goods_list.length > 0) || (normalizedGoods.event_benefits && normalizedGoods.event_benefits.length > 0)) console.log('🔁 OCR 휴리스틱으로 추가 보완 수행');
                } catch (e) {
                    console.warn('OCR 보완 시도 중 오류:', e.message || e);
                }
            }

            console.log('🎉 성공! 클라이언트로 전송');
            return res.json({ success: true, goods: normalizedGoods, uploaded_images: uploadedBase64Uris });
        } catch (errAi) {
            console.error('❌ 이미지 분석 중 오류 (AI):', errAi.message || errAi);
            return res.status(500).json({ success: false, error: errAi.message || String(errAi) });
        }
    } catch (err) {
        console.error('❌ 파일 업로드 핸들러 오류:', err.message || err);
        return res.status(500).json({ success: false, error: err.message || String(err) });
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

            // 1️⃣ AI 프롬프트 작성 — 사용자가 제공한 정확한 프롬프트 템플릿을 삽입합니다.
            const pastEventPrompt = `당신은 "과거 행사 정보 분석 AI"입니다. 다음 지침에 따라 정보를 수집하고 JSON 형태로 출력해주세요.

1. 대상 행사: ${event_title}
2. 검색 범위: 인터넷 상에서 찾을 수 있는 해당 행사 및 유사 과거 행사 정보
3. 반환 데이터는 JSON 형태로 다음 필드 구조를 따라야 함:

{
    "과거행사정보": [
        {
            "행사명": "YYYY년 행사명",
            "날짜": "YYYY-MM-DD",
            "링크": "행사 관련 링크",
            "운영반응": {
                "긍정": ["긍정적 피드백1", "긍정적 피드백2"],
                "부정": ["부정적 피드백1", "부정적 피드백2"]
            },
            "굿즈정보": [
                {
                    "굿즈명": "상품명",
                    "가격": "XXXXX원",
                    "품절정보": "예: 출시 15분만에 품절",
                    "구매가능성": 1,
                    "굿즈사진": "원본 사진 링크 또는 데이터"
                }
            ]
        }
    ],
    "유사행사정보": [
        {
            "행사명": "유사행사명",
            "날짜": "YYYY-MM-DD",
            "링크": "관련 링크"
        }
    ]
}

4. 굿즈 정보 관련 정책:
     - 가능하면 가장 빠르게 품절된 굿즈와 여유있었던 굿즈를 구분
     - 품절 시점, 재고 정보 등 구매 가능성을 판단할 수 있는 데이터 포함
     - 데이터가 없으면 해당 항목은 생략
     - AI가 굿즈 구매가능성을 1, 2, 3위로 판단

5. 행사 전반 관련:
     - 굿즈 외 운영, 현장 반응 등 정보 제공
     - 긍정, 부정으로 구분

6. 출력 형식:
    - 반드시 JSON 형식 준수
    - 각 설명은 설명 문자열(예: "입장 절차가 원활했다")만으로 제공

출력 예시는 다음과 같습니다:

{
    "과거행사정보": [
        {
            "행사명": "2024 AAA 콘서트",
            "날짜": "2024-08-12",
            "링크": "https://example.com/2024AAA",
            "운영반응": {
                "긍정": ["입장 절차가 원활했다", "팬서비스가 좋았다"],
                "부정": ["굿즈 구매 줄이 너무 길었다", "화장실이 부족했다"]
            },
            "굿즈정보": [
                {
                    "굿즈명": "AAA 공식 티셔츠",
                    "가격": "45000원",
                    "품절정보": "출시 10분만에 품절",
                    "구매가능성": 1,
                    "굿즈사진": "https://example.com/img/tshirt.jpg"
                }
            ]
        }
    ],
    "유사행사정보": [
        {
            "행사명": "2023 AAA 콘서트",
            "날짜": "2023-08-10",
            "링크": "https://example.com/2023AAA"
        }
    ]
}
`;

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

      // 3️⃣ JSON 파싱 — 도구를 사용할 때 모델이 plain text로 반환할 수 있으므로
      // 먼저 직접 JSON.parse를 시도하고, 실패하면 텍스트에서 JSON을 추출해 파싱합니다.
      let pastEventData;
      try {
          console.log("🔄 JSON 파싱 시도 중 (직접)...");
          pastEventData = JSON.parse(text);
          console.log("✅ JSON 파싱 성공!");
      } catch (parseError) {
          console.warn("⚠️ 직접 파싱 실패, 텍스트에서 JSON 추출 시도:", parseError.message);
          const extracted = extractJsonFromText(text);
          if (extracted) {
              pastEventData = extracted;
              console.log("✅ 텍스트에서 JSON 추출 성공!");
          } else {
              console.error("❌ JSON 파싱 오류: 모델 응답에서 JSON을 추출하지 못했습니다.");
              return res.status(500).json({ 
                  success: false, 
                  error: "AI 응답을 파싱할 수 없습니다.", 
                  rawResponse: text 
              });
          }
      }

      // Normalize various possible response key names (support user's Korean template)
      function normalizePastEventData(raw) {
          if (!raw || typeof raw !== 'object') return raw;

          // If already in expected shape and seems valid, return as-is (but still dedupe)
          const initialList = Array.isArray(raw.past_events_list) ? raw.past_events_list.map(p => ({ title: p.title || p.행사명 || '', link: p.link || p.링크 || '' })) : [];
          const collected = [];

          const pushEvent = (title, link) => {
              const t = (title || '').trim();
              const l = (link || '').trim();
              // Deduplicate by link if present, else by normalized title
              const exists = collected.find(e => (l && e.link === l) || (!l && e.title && e.title === t));
              if (!exists) {
                  collected.push({ title: t, link: l });
              }
          };

          // Collect from English-style raw past_events_list
          initialList.forEach(p => pushEvent(p.title, p.link));

          // Handle Korean keys from user's prompt: 과거행사정보
          const korList = raw.과거행사정보 || raw['과거행사정보'];
          if (Array.isArray(korList)) {
              korList.forEach(item => {
                  pushEvent(item?.행사명 || item?.title || '', item?.링크 || item?.link || '');
              });
          }

          // 유사행사정보 추가
          const korSimilar = raw.유사행사정보 || raw['유사행사정보'];
          if (Array.isArray(korSimilar)) {
              korSimilar.forEach(u => pushEvent(u?.행사명 || u?.title || '', u?.링크 || u?.link || ''));
          }

          const out = { past_events_list: collected, feedback: { goods: [], contents: { positive: [], negative: [] } } };

          // Extract feedback goods and contents from korList items if present
          const processFeedbackFromItem = (item) => {
              if (!item) return;
              const op = item?.운영반응 || item?.운영 || null;
              if (op) {
                  const pos = op?.긍정 || op?.positive || [];
                  const neg = op?.부정 || op?.negative || [];
                  (Array.isArray(pos) ? pos : []).forEach(s => {
                      const desc = String(s);
                      out.feedback.contents.positive.push({ title: desc.slice(0, 40), description: desc });
                  });
                  (Array.isArray(neg) ? neg : []).forEach(s => {
                      const desc = String(s);
                      out.feedback.contents.negative.push({ title: desc.slice(0, 40), description: desc });
                  });
              }

              const g = item?.굿즈정보 || item?.굿즈 || item?.goods || null;
              if (Array.isArray(g)) {
                  g.forEach(gg => {
                      const title = gg?.굿즈명 || gg?.goods_name || gg?.name || '';
                      const parts = [];
                      if (gg?.가격 || gg?.price) parts.push(`가격: ${gg?.가격 || gg?.price}`);
                      if (gg?.품절정보) parts.push(`품절: ${gg?.품절정보}`);
                      if (gg?.구매가능성 !== undefined) parts.push(`구매가능성: ${gg?.구매가능성}`);
                      out.feedback.goods.push({ title: title || '굿즈', description: parts.join('; ') });
                  });
              }
          };

          if (Array.isArray(korList)) korList.forEach(processFeedbackFromItem);
          if (Array.isArray(korSimilar)) korSimilar.forEach(processFeedbackFromItem);

          // Deduplicate feedback.goods by title
          const seenGoods = new Set();
          out.feedback.goods = out.feedback.goods.filter(g => {
              const key = (g.title || '').toLowerCase();
              if (seenGoods.has(key)) return false;
              seenGoods.add(key);
              return true;
          });

          // Deduplicate positive/negative descriptions with fuzzy matching
          const normalizeText = (str) => {
              if (!str) return '';
              try {
                  // Remove punctuation, collapse whitespace, lowercase
                  return String(str).replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
              } catch (e) {
                  return String(str).replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
              }
          };

          const jaccardSimilarity = (a, b) => {
              if (!a || !b) return 0;
              const sa = new Set(a.split(' '));
              const sb = new Set(b.split(' '));
              const inter = [...sa].filter(x => sb.has(x)).length;
              const union = new Set([...sa, ...sb]).size;
              return union === 0 ? 0 : inter / union;
          };

          const dedupeSimilarEntries = (arr) => {
              const outArr = [];
              for (const item of (arr || [])) {
                  const desc = String(item?.description || item?.title || '').trim();
                  if (!desc) continue;
                  const norm = normalizeText(desc);
                  let merged = false;
                  for (let i = 0; i < outArr.length; i++) {
                      const existing = outArr[i];
                      const existingDesc = String(existing.description || existing.title || '').trim();
                      const existingNorm = normalizeText(existingDesc);

                      const sim = jaccardSimilarity(norm, existingNorm);

                      // additional overlap metric (intersection / min token count)
                      const tokensA = norm.split(' ').filter(Boolean);
                      const tokensB = existingNorm.split(' ').filter(Boolean);
                      const minToken = Math.min(tokensA.length || 1, tokensB.length || 1);
                      const interCount = tokensA.filter(t => tokensB.includes(t)).length;
                      const overlapRatio = interCount / (minToken || 1);

                      // Duplicate if high Jaccard OR high overlap ratio OR containment
                      if (sim >= 0.65 || overlapRatio >= 0.75 || existingNorm.includes(norm) || norm.includes(existingNorm)) {
                          // Prefer the more informative (longer) description
                          if ((desc || '').length > (existingDesc || '').length) {
                              outArr[i] = item;
                          }
                          merged = true;
                          break;
                      }
                  }
                  if (!merged) outArr.push(item);
              }
              return outArr;
          };

          out.feedback.contents.positive = dedupeSimilarEntries(out.feedback.contents.positive);
          out.feedback.contents.negative = dedupeSimilarEntries(out.feedback.contents.negative);

          return out;
      }

      const normalized = normalizePastEventData(pastEventData);
      console.log('🔁 과거행사 데이터 정규화 결과:', { pastCount: normalized?.past_events_list?.length || 0, goodsFeedback: normalized?.feedback?.goods?.length || 0 });

      // 4️⃣ 결과 반환
      console.log("🎉 성공! 과거 행사 데이터 클라이언트로 전송");
      return res.json({ success: true, pastEvents: normalized });

  } catch (err) {
      console.error("❌ 서버 오류:", err.message);
      return res.status(500).json({ 
          success: false, 
          error: err.message 
      });
  }
});

// Better bind and diagnostic logging
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const HOST = process.env.HOST || '0.0.0.0';

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err && err.stack ? err.stack : err);
    // do not exit immediately to allow debug; in production you may want to exit
});

process.on('unhandledRejection', (reason, p) => {
    console.error('❌ Unhandled Rejection at:', p, 'reason:', reason);
});

app.listen(PORT, HOST, () => {
    console.log(`✨ Universal Web Crawler Server running on http://${HOST}:${PORT}`);
    console.log('🔎 Process env:', { TEST_MODE: process.env.TEST_MODE, ALLOW_TEST_FALLBACK: process.env.ALLOW_TEST_FALLBACK });
});