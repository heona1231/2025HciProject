// /data/types.ts

/**
 * 현재 화면 상태를 나타내는 타입
 * 'DEFAULT': 초기 화면 (HomeView)
 * 'INPUT': 분석 정보 입력 화면 (HomeInputView)
 * 'DETAIL': 분석 결과 상세 화면 (HomeDetailView)
 */
export type ViewState = 'DEFAULT' | 'INPUT' | 'DETAIL';

/**
 * 굿즈 목록 아이템 구조
 */
export interface GoodsItem {
    goods_name: string;
    price: string;
}

/**
 * AI 분석을 통해 얻게 될 최종 이벤트 데이터 구조 (DetailView에 전달될 데이터)
 */
export interface EventData {
    event_title: string;
    official_link: string;
    
    // 행사 개요 정보
    event_overview: {
        address: string;
        date_range: string;
        duration_days: number;
        daily_hours: string;
    } | null;

    // 예매 정보
    reservation_info: {
        open_date: string;
        method: string;
        notes: string;
    } | null;

    // 입장 정보
    entrance_info: {
        entry_time: string;
        entry_method: string;
        entry_items: string[];
    } | null;

    // 행사 콘텐츠 (프로그램 목록)
    event_contents: {
        title: string;
        description: string;
    }[] | null;

    // 행사 특전 정보
    event_benefits: string[] | null;

    // 이미지에서만 추출된 굿즈/특전 (원본 형태로 보존)
    image_goods_list?: GoodsItem[] | null;
    image_event_benefits?: string[] | null;

    // 굿즈 목록
    goods_list: GoodsItem[] | null;

    // 분석을 위해 업로드되었던 이미지 목록 (URI)
    uploaded_images: string[]; 
}

// HomeView에서 사용될 단순한 이벤트 미리보기 데이터
export interface SimpleEventCardData {
    id: number;
    title: string;
    dday: string;
    date: string;
    status: string; // '예매 중' | '종료' 등
    imageUrl: string;
}
