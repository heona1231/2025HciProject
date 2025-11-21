# 프로젝트 실행 가이드

## 1. 환경 설정

프로젝트 루트 내 경로:

```
2025HciProject/ai-server/
```

`ai-server` 폴더 안에 **.env 파일을 생성**한 뒤 아래 내용을 추가하세요.
`YOUR_API_KEY` 부분에는 본인의 **Gemini API Key**를 입력합니다.

```
GEMINI_API_KEY="YOUR_API_KEY"
```

---

## 2. 실행 방법

### 서버 실행

```bash
cd ai-server
npm start
```

### 클라이언트 실행

```bash
cd MyApp
npx expo start
```

---

## 3. 접속 주소

* **프론트엔드 접속 주소:**
  [http://localhost:8081/](http://localhost:8081/)

---

## 4. 서비스 사용 시 주의사항

* 행사 정보를 입력하고 AI 분석을 완료한 뒤 **‘과거 행사 이력’ 탭**을 클릭하여 분석을 완료한 뒤
  ‘특전/굿즈’ → ‘굿즈 정보'에서 **+ 버튼을 눌러 굿즈를 추가해야**
  **MyPage에서 품절 여부 확인이 가능합니다.**
* 분석이 실패한 경우
  다른 탭(예: ‘행사예매/입장’, ‘특전/굿즈’)으로 이동 후
  다시 ‘과거 행사 이력’ 탭으로 돌아오면 **재분석이 진행됩니다.**
* 현재 ‘과거 행사 이력’ 탭에 표시되는 **과거 유사 행사 목록은 링크 이동이 지원되지 않습니다.**

---

## 5. 주요 폴더 구조

```
2025HciProject/
├── ai-server/
│   └── server.js
│
└── MyApp/
    ├── app/
    │   ├── (tabs)/
    │   │   ├── _layout.tsx
    │   │   ├── home.tsx
    │   │   └── mypage.tsx
    │   ├── components/
    │   │   ├── HomeDefaultView.tsx
    │   │   ├── HomeDetailView.tsx
    │   │   ├── HomeInputView.tsx
    │   │   └── SharedEventHeader.tsx
    │   ├── context/
    │   │   └── EventContext.tsx
    │   ├── data/
    │   │   └── types.ts
    │   ├── _layout.tsx
    │   ├── getname.tsx
    │   ├── index.tsx
    │   └── onboarding.tsx
    │
    └── assets/
        ├── images/
        ├── logo.png
        └── ribbon.png
```

---

## 6. 주요 파일 설명

| 경로                                         | 설명                  |
| ------------------------------------------ | ------------------- |
| `ai-server/server.js`                      | Gemini API 서버 구동 파일 |
| `MyApp/app/(tabs)/_layout.tsx`             | 하단 탭바 기본 레이아웃 설정    |
| `MyApp/app/(tabs)/home.tsx`                | Home 화면 데이터 전달 처리   |
| `MyApp/app/(tabs)/mypage.tsx`              | MyPage 프론트엔드 코드     |
| `MyApp/app/components/HomeDefaultView.tsx` | Home 기본 화면 UI       |
| `MyApp/app/components/HomeInputView.tsx`   | 행사 정보 입력 UI         |
| `MyApp/app/components/HomeDetailView.tsx`  | Home 상세 메인 UI       |
| `MyApp/app/data/types.ts`                  | 데이터 타입 정의           |
| `MyApp/app/_layout.tsx`                    | 앱 전체 화면 전환 플로우 정의   |
| `MyApp/app/index.tsx`                      | 앱 초기 진입 화면          |
| `MyApp/app/getname.tsx`                    | 이름 입력 화면            |
| `MyApp/app/onboarding.tsx`                 | 온보딩 화면              |

