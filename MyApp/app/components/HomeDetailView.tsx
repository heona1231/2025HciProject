// /components/HomeDetailView.tsx

import * as React from "react";
import {
    Image,
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import SharedEventHeader from './SharedEventHeader';
import { useEventContext } from '../context/EventContext';
// Stack.Screen을 사용하려면 @react-navigation/native-stack이 필요하지만, 여기서는 무시합니다.
// import { Stack } from 'expo-router'; // 필요한 경우

// =========================================================
// 💡 새로운 과거 행사 관련 타입 정의 (임시로 여기에 포함 - 실제론 ../data/types에 추가해야 함)
// =========================================================
export interface PastEventItem {
    title: string;
    link: string;
}

export interface FeedbackItem {
    title: string;
    description: string;
}

export interface PastEventsData {
    past_events_list: PastEventItem[];
    feedback: {
        goods: FeedbackItem[];
        contents: {
            positive: FeedbackItem[];
            negative: FeedbackItem[];
        };
    };
}

// 타입 임포트 (상위 파일에서 정의된 타입을 사용)
// EventData 타입에 pastEventsData 필드가 추가되어야 합니다. (아래 코드에서는 'currentData.pastEventsData'로 접근 가능하다고 가정)
import { ViewState, EventData, GoodsItem } from "../data/types";
// EventData 인터페이스가 다음과 같이 확장되었다고 가정:
// interface EventData {
//     ...
//     pastEventsData?: PastEventsData; // 백엔드에서 받아온 과거 행사 데이터
// }


/**
 * HomeDetailView에서 사용할 Props 정의
 */
interface HomeDetailViewProps {
    /** 상위 컴포넌트(home.tsx)에서 전달받은 AI 분석 결과 데이터 */
    data: EventData;
    /** 이미지에서 받아온 원본 분석 데이터 (옵션) */
    imageData?: any;
    /** 'DEFAULT' 뷰로 돌아가기 위해 상위 컴포넌트의 navigate 함수를 받음 */
    onBack: (view: ViewState) => void;
}


const HomeDetailView: React.FC<HomeDetailViewProps> = ({ data: currentData, imageData, onBack }) => {
    
    const [open, setOpen] = React.useState(false); // 드롭다운 상태
    const [activeTab, setActiveTab] = React.useState("행사예매/입장");

    // EventContext에서 addGoods 함수 가져오기
    const { addGoods, myGoods } = useEventContext();

    // 💡 1. 과거 행사 데이터 상태 및 로딩 상태 추가
    const [pastEvents, setPastEvents] = React.useState<PastEventsData | undefined>(
        (currentData as any).pastEventsData // EventData에 pastEventsData 필드가 있다고 가정
    );
    const [isLoadingPastEvents, setIsLoadingPastEvents] = React.useState(false);
    
    // UI 유지를 위한 더미 이벤트 목록 (드롭다운)
    const events = ["행사 1", "행사 2", "행사 3"]; // 임시 이벤트 목록

    // 💡 굿즈를 MyPage 목록에 추가하는 함수
    const handleAddToMyGoods = (goods: GoodsItem, imageSource?: any) => {
        if (myGoods.length >= 3) {
            Alert.alert("알림", "최대 3개까지만 추가할 수 있습니다!");
            return;
        }

        // imageSource가 { uri: '...' } 형태일 수 있으므로 문자열 URI로 정규화
        let imageUri: string | undefined;
        if (!imageSource) {
            imageUri = undefined;
        } else if (typeof imageSource === 'string') {
            imageUri = imageSource;
        } else if (typeof imageSource === 'object' && imageSource.uri && typeof imageSource.uri === 'string') {
            imageUri = imageSource.uri;
        } else {
            // require(...)로 반환되는 로컬 리소스는 숫자 타입일 수 있음. 이 경우 로컬 이미지를 사용하는 대신 기본 플레이스홀더 사용
            imageUri = undefined;
        }

        const newGood = {
            id: Date.now(), // 고유한 ID 생성
            name: goods.goods_name,
            price: parseFloat(String(goods.price).replace(/[^0-9]/g, '') || "0"),
            image: imageUri || "https://via.placeholder.com/100",
            keyword: goods.goods_name,
            searchCount: 0,
        };
        addGoods(newGood);
        Alert.alert("성공", `${goods.goods_name}을(를) 구매목록에 추가했습니다! (${myGoods.length + 1}/3)`);
    };

    // 헬퍼 함수
    const pad = (num: number): string => (num < 10 ? `0${num}` : `${num}`);

    // 정책 1-1: 주소 표시: {공식 링크에 입력되어있는 명} ({도로명주소})
    const formatAddress = (address: string | undefined): string => {
        if (!address) return "정보 없음";
        // 예시: "일산 킨텍스 제2전시장 9, 10홀/경기도 고양시 일산서구 킨텍스로 217-60"
        const parts = address.split("/");
        const placeName = parts[0] ? parts[0].trim() : "장소 미상";
        const roadAddress = parts[1] ? parts[1].trim() : "주소 미상";
        return `${placeName} (${roadAddress})`;
    };

    // 정책 1-2: 일시 표시: YYYY-MM-DD HH-MM({요일})형태로 정리
    // currentData.event_overview.date_range 포맷은 "YYYY-MM-DD HH:MM~YYYY-MM-DD HH:MM" 가정
    const formatDate = (dateRange: string | undefined): string => {
        if (!dateRange || !dateRange.includes('~')) {
            return "정보 없음";
        }
        const [startDateTimeStr] = dateRange.split('~').map(s => s.trim());

        // 시작일 파싱
        const startDate = new Date(startDateTimeStr.replace(/\./g, '-').replace(/\//g, '-'));
        // 유효하지 않은 날짜인 경우 처리
        if (isNaN(startDate.getTime())) {
             return "정보 없음";
        }
        const startDay = ['일', '월', '화', '수', '목', '금', '토'][startDate.getDay()];
        const startFormatted = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())} ${pad(startDate.getHours())}:${pad(startDate.getMinutes())}(${startDay})`;

        return startFormatted; // 시작일시만 반환
    };

    // 정책 2: 디데이 표시 정책
    // 'YYYY-MM-DD HH:MM' 형태의 문자열을 받아서 D-Day와 날짜를 반환
    const calculateDDay = (dateStr: string | undefined, type: '예약' | '행사'): { dday: string; date: string } => {
        if (!dateStr || dateStr.length < 10 || dateStr === "YYYY-MM-DD HH:MM") {
            return { dday: "D-?", date: type === '예약' ? "예약일 미정" : "행사일 미정" };
        }

        const targetDate = new Date(dateStr.substring(0, 10).replace(/\./g, '-'));
        if (isNaN(targetDate.getTime())) {
            return { dday: "D-?", date: type === '예약' ? "예약일 미정" : "행사일 미정" };
        }
        const today = new Date();
        // 시간을 00:00:00으로 설정하여 날짜만 비교
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const dateFormatted = dateStr.substring(0, 10).replace(/-/g, '.');

        let dday: string;
        if (diffDays === 0) {
            dday = "D-DAY";
        } else if (diffDays > 0) {
            dday = `D-${diffDays}`;
        } else {
            dday = "종료";
        }

        return { dday, date: dateFormatted };
    };

    // 정책 4-1: 입장시간 (별도 정보가 없다면 행사 운영시작시간으로 입력)
    const getEntryTime = (entryTime: string | undefined, dailyHours: string | undefined): string => {
        // 별도 정보가 있으면 (공백, "정보 없음" 등이 아니면) 그대로 사용
        if (entryTime && entryTime.trim() !== "" && entryTime.trim() !== "정보 없음") {
            return entryTime;
        }

        // 별도 정보가 없으면 행사 운영 시작 시간 사용
        if (dailyHours) {
            // (월)10:00~18:00/(화)11:00~15:00... 형태에서 첫번째 시작 시간 추출
            const match = dailyHours.match(/\)\s*(\d{2}:\d{2})~/);
            if (match && match[1]) {
                return `행사 운영 시작 시간 (${match[1]})`;
            }
        }

        return "정보 없음";
    };

    const reservationInfo = currentData.reservation_info;
    // '예약이 필요없다' 조건 확인: reservation_info 객체가 없거나, open_date, method, notes가 모두 공백/정보없음 등일 경우
    const isNoReservationRequired =
        !reservationInfo ||
        (
            (!reservationInfo.open_date || reservationInfo.open_date.trim() === "YYYY-MM-DD HH:MM") &&
            (!reservationInfo.method || reservationInfo.method.trim() === "정보 없음" || reservationInfo.method.trim() === "") &&
            (!reservationInfo.notes || reservationInfo.notes.trim() === "정보 없음" || reservationInfo.notes.trim() === "")
        );

    // D-Day 계산
    const { dday: reservationDDay, date: reservationDate } = calculateDDay(
        currentData.reservation_info?.open_date,
        '예약'
    );
    // 행사 첫날 계산 (date_range의 시작일시)
    const eventStartDateStr = currentData.event_overview?.date_range?.split('~')[0]?.trim();
    const { dday: eventDDay, date: eventDate } = calculateDDay(
        eventStartDateStr,
        '행사'
    );


    // 로컬 에셋 경로 매핑 함수 (정책 3: 굿즈사진은 원본 사진을 그대로 넣기 가정)
    const getLocalImage = (name: string) => {
        // 실제 로컬 에셋 경로를 가정하고, 이름에 따라 다른 이미지를 반환합니다.
        // 현재는 Mock 데이터 제거로 인해 임시 이미지 경로를 반환합니다.
        switch (name) {
            case "ganadi.png":
                return require("../../assets/images/ganadi.png");
            case "black.png":
                return require("../../assets/images/black.png");
            case "logoWhite.png":
                return require("../../assets/images/logoWhite.png");
            case "arrowdown.png":
                return require("../../assets/images/arrowdown.png");
            // 정책 3: 굿즈 사진은 분석 부탁한 원본 사진을 그대로 사용 (임시 이미지 사용)
            case "ganadi_keyring_analyzed.jpg":
                return require("../../assets/images/goods1.png"); // 임시 이미지 사용
            case "ganadi_gritok_analyzed.jpg":
                return require("../../assets/images/goods2.png"); // 임시 이미지 사용
            default:
                return require("../../assets/images/goods1.png"); // 기본 대체 이미지
        }
    };
    
    // 💡 2. 과거 행사 정보 로딩 함수
    const fetchPastEvents = React.useCallback(async () => {
        // 이벤트 제목이 없거나, 이미 데이터가 로드되었으면 API 호출을 건너뜁니다.
        if (!currentData.event_title || pastEvents) return; 

        setIsLoadingPastEvents(true);
        try {
            const response = await fetch('http://localhost:4000/search-past-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_title: currentData.event_title }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: { success: boolean, pastEvents?: PastEventsData, error?: string } = await response.json();
            
            if (result.success && result.pastEvents) {
                setPastEvents(result.pastEvents);
            } else {
                console.error("Failed to fetch past events:", result.error || "Unknown error");
                setPastEvents(undefined); 
            }
        } catch (error) {
            console.error("Error fetching past events:", error);
            setPastEvents(undefined); // API 호출 실패 시 데이터 비우기
        } finally {
            setIsLoadingPastEvents(false);
        }
    }, [currentData.event_title, pastEvents]);
    
    // 💡 3. '과거행사기록' 탭 활성화 시 데이터 로드
    React.useEffect(() => {
        if (activeTab === "과거행사기록") {
            fetchPastEvents();
        }
    }, [activeTab, fetchPastEvents]);


    // '특전/굿즈' 탭 렌더링 함수 (정책 1, 2, 3 반영)
    const renderBenefitGoodsTab = () => {
        const hasContents = currentData.event_contents && currentData.event_contents.length > 0;
        const hasBenefits = currentData.event_benefits && currentData.event_benefits.length > 0;
        const hasGoods = currentData.goods_list && currentData.goods_list.length > 0;

        // 모든 섹션에 정보가 별로 없을 경우 (정보가 없거나 길이가 0일 때) 전체 섹션을 표시하지 않는다.
        if (!hasContents && !hasBenefits && !hasGoods) {
            return (
                <View style={styles.infoSection}>
                    <Text style={styles.sectionDescription}>준비된 행사 정보가 없습니다.</Text>
                </View>
            );
        }

        return (
            <>
                {/* 정책 1: 행사 콘텐츠 */}
                {hasContents && (
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>행사 콘텐츠</Text>
                        <Text style={styles.sectionDescription}>행사에서 즐길 수 있는 요소들을 리스트 형태로 정리해보았어요.</Text>

                        <View style={styles.tabContentSeparator} />

                        {/* 행사 콘텐츠 항목 */}
                        {currentData.event_contents?.map((content, idx) => (
                            <View key={idx} style={styles.contentItem}>
                                <Text style={styles.contentTitle}>•• {content.title}</Text>
                                <Text style={styles.contentDescription}>{content.description}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 정책 2: 행사 특전 */}
                {hasBenefits && (
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>행사 특전</Text>
                        <Text style={styles.sectionDescription}>행사에 참여했을 때 기본으로 제공되는 특전 정보에요.</Text>
                        <View style={styles.tabContentSeparator} />

                        {/* 서버에서 전달된 event_benefits를 그대로 표시합니다.
                            - 문자열이면 그대로 출력
                            - 객체이면 JSON 형태로 간단히 보여줍니다 */}
                        {currentData.event_benefits?.map((benefit: any, idx: number) => {
                            const display = (typeof benefit === 'string')
                                ? benefit
                                : (typeof benefit === 'object' && benefit !== null)
                                    ? JSON.stringify(benefit)
                                    : String(benefit);

                            return (
                                <View key={idx} style={styles.benefitItem}>
                                    <View style={styles.itemNumber}>
                                        <Text style={styles.itemNumberText}>{idx + 1}</Text>
                                    </View>
                                    <Image source={getLocalImage("goods1.png")} style={styles.goodsImage} />
                                    <Text style={styles.benefitText}>{display}</Text>
                                </View>
                            );
                        })}

                        {/* 이미지에서 받아온 원본 JSON 정보(가능한 경우) */}
                        {imageData && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 6 }}>이미지 원본 (분석 결과)</Text>
                                <Text style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>이미지 분석에서 반환된 원본 JSON을 그대로 표시합니다.</Text>

                                {/* 굿즈 리스트(원본) */}
                                {imageData?.goods?.goods_list && Array.isArray(imageData.goods.goods_list) && (
                                    <View style={{ marginBottom: 8 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '600' }}>굿즈(이미지 원본)</Text>
                                        {imageData.goods.goods_list.map((g: any, i: number) => (
                                            <Text key={`img-g-${i}`} style={{ fontSize: 12, color: '#333', marginLeft: 8 }}>
                                                • {JSON.stringify(g)}
                                            </Text>
                                        ))}
                                    </View>
                                )}

                                {/* 이벤트 특전(원본) */}
                                {imageData?.goods?.event_benefits && Array.isArray(imageData.goods.event_benefits) && (
                                    <View style={{ marginBottom: 8 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '600' }}>특전(이미지 원본)</Text>
                                        {imageData.goods.event_benefits.map((b: any, i: number) => (
                                            <Text key={`img-b-${i}`} style={{ fontSize: 12, color: '#333', marginLeft: 8 }}>
                                                • {typeof b === 'string' ? b : JSON.stringify(b)}
                                            </Text>
                                        ))}
                                    </View>
                                )}

                                {/* 업로드된 이미지 데이터 URI 목록 (원본) */}
                                {imageData?.uploaded_images && Array.isArray(imageData.uploaded_images) && (
                                    <View>
                                        <Text style={{ fontSize: 13, fontWeight: '600' }}>업로드된 이미지(원본)</Text>
                                        {imageData.uploaded_images.map((u: string, i: number) => (
                                            <Text key={`img-u-${i}`} style={{ fontSize: 11, color: '#666', marginLeft: 8 }} numberOfLines={1} ellipsizeMode="middle">
                                                • {u}
                                            </Text>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}

              
                {/* 정책 3: 굿즈 정보 */}
                {hasGoods && (
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>굿즈 정보</Text>
                        <Text style={styles.sectionDescription}>행사에서 판매하는 굿즈 정보에요.</Text>
                        <View style={styles.tabContentSeparator} />

                        {currentData.goods_list?.map((goods: GoodsItem, idx: number) => {
                            // AI가 반환한 image_index를 사용합니다.
                            const imageIndexFromAI = (goods as any).image_index; 
                            
                            const maybeImagePath = (goods as any).image_path;
                            const uploadedImgs = (currentData as any).uploaded_images || [];
                            
                            // 💡 굿즈 목록 순서(idx) 대신 AI 인덱스를 사용하여 이미지 배열에서 가져옵니다. (원본 URI)
                            const userImg = (imageIndexFromAI !== undefined && imageIndexFromAI >= 0 && imageIndexFromAI < uploadedImgs.length)
                                ? uploadedImgs[imageIndexFromAI]
                                : null; // 유효하지 않은 인덱스면 null 처리

                            const imageSource = maybeImagePath
                                ? getLocalImage(maybeImagePath)
                                : userImg
                                    ? { uri: userImg }
                                    : getLocalImage("default");

                            return (
                                <View key={idx} style={styles.goodsItem}>
                                    <View style={styles.itemNumber}>
                                        <Text style={styles.itemNumberText}>{idx + 1}</Text>
                                    </View>
                                    
                                    {/* 💡 수정: Image를 TouchableOpacity로 감싸서 onPress 이벤트 추가 */}
                                    <TouchableOpacity
                                        // userImg가 존재할 때만 활성화 (원본 파일 URI가 있을 때만 눌러서 확대)
                                        onPress={() => {
                                            if (userImg) {
                                                // ⚠️ 주석: 이 부분에 원본 이미지를 보여주는 모달 또는 뷰어 함수를 호출하세요.
                                                // 예: handleImageZoom(userImg);
                                                console.log("원본 이미지 확대 요청:", userImg.slice(0, 50));
                                                Alert.alert("원본 이미지 확인", "이미지 확대 로직을 구현해야 합니다.\nURI: " + userImg.slice(0, 50));
                                            } else {
                                                Alert.alert("정보 없음", "사용자가 업로드한 원본 이미지 파일이 없습니다.");
                                            }
                                        }}
                                        disabled={!userImg} // 원본 이미지가 없으면 비활성화
                                    >
                                        {/* 정책 3: 굿즈 사진은 분석 부탁한 원본 사진을 그대로 사용 (없을 경우 대체 이미지) */}
                                        <Image
                                            source={imageSource}
                                            style={styles.goodsImage}
                                        />
                                    </TouchableOpacity>

                                    <View style={styles.goodsInfo}>
                                        {/* 정책 3: 굿즈명 (한글, 영어, 특수문자) */}
                                        <Text style={styles.goodsName}>{goods.goods_name}</Text>
                                        {/* 정책 3: 가격 (XXXXX원) */}
                                        <Text style={styles.goodsPrice}>{goods.price}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleAddToMyGoods(goods, imageSource)}>
                                        <Ionicons name="add-circle-outline" size={24} color="#000" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        {/* 하단 담기 버튼 목업 */}
                        <TouchableOpacity style={styles.addToCartMock} onPress={() => Alert.alert("알림", "해당 굿즈를 담았습니다.")}>
                            <Text style={styles.addToCartText}>해당 굿즈를 담았어요.</Text>
                            <Ionicons name="chevron-forward" size={16} color="#FF59AD" />
                            <Text style={styles.addToCartLink}>보러가기</Text>
                        </TouchableOpacity>

                    </View>
                )}
            </>
        );
    };

    // 💡 3. '과거행사기록' 탭 렌더링 함수 (정책 4 반영)
    const renderPastEventTab = () => {
        // 💡 로딩 상태 처리
        if (isLoadingPastEvents) {
            return (
                <View style={styles.infoSection}>
                    <Text style={styles.sectionDescription}>과거 유사 행사 정보를 분석 중입니다...</Text>
                    {/* 로딩 스피너를 위한 자리 */}
                </View>
            );
        }

        // 안전 체크: pastEvents 및 내부 필드가 유효한지 확인
        const hasPastList = Array.isArray(pastEvents?.past_events_list) && pastEvents.past_events_list.length > 0;
        if (!pastEvents || !hasPastList) {
             return (
                 <View style={styles.infoSection}>
                    <Text style={styles.sectionDescription}>과거 유사 행사에 대한 정보를 찾을 수 없습니다.</Text>
                </View>
             );
        }

        // pastEvents 상태에서 데이터를 가져와 사용
        const pastEventsData = pastEvents as PastEventsData;
        
        // 과거 행사 정보가 있지만, 내용이 부실할 경우 (옵션)
        // if (pastEventsData.past_events_list.length === 0 && pastEventsData.feedback.goods.length === 0) { ... }

        return (
            <View style={{ marginTop: 10 }}>
                <Text style={styles.pastEventTitle}>과거 유사 행사</Text>
                <Text style={styles.pastEventDescription}>
                    과거에 진행된 유사 행사에 대한 정보를{"\n"}정리해보았어요!
                </Text>

                {/* 과거 행사 목록 (pastEventsData.past_events_list 사용) */}
                <View style={styles.pastEventList}>
                    {pastEventsData.past_events_list.map((event, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={styles.pastEventItem} 
                            onPress={() => Alert.alert("이동", `링크: ${event.link}`)} // 실제로는 웹뷰 등으로 이동
                        >
                            <Text style={styles.pastEventName}>{event.title}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.pastEventLink}>보러가기</Text>
                                <Ionicons name="chevron-forward" size={16} color="#000" />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 정책 4: 굿즈 구매 관련 피드백 (운영 방식 정보만 제공) */}
                {Array.isArray(pastEventsData.feedback?.goods) && pastEventsData.feedback.goods.length > 0 && (
                    <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackSectionTitle}>굿즈 구매 관련</Text>
                        {pastEventsData.feedback.goods.map((item: FeedbackItem, index: number) => (
                            <Text key={index} style={styles.feedbackText}>
                                • [{item.title} : {item.description}]
                            </Text>
                        ))}
                    </View>
                )}

                {/* 정책 4: 행사 콘텐츠/운영 관련 피드백 (긍정/부정 구분) */}
                {((Array.isArray(pastEventsData.feedback?.contents?.positive) && pastEventsData.feedback.contents.positive.length > 0) || (Array.isArray(pastEventsData.feedback?.contents?.negative) && pastEventsData.feedback.contents.negative.length > 0)) && (
                    <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackSectionTitlePink}>행사 전반 관련</Text>

                        {/* 긍정적 의견 */}
                        {Array.isArray(pastEventsData.feedback.contents.positive) && pastEventsData.feedback.contents.positive.length > 0 && (
                            <>
                                <Text style={styles.sentimentTitlePositive}>긍정의견</Text>
                                {pastEventsData.feedback.contents.positive.map((item: FeedbackItem, index: number) => (
                                    <Text key={index} style={styles.feedbackText}>
                                        • [{item.title} : {item.description}]
                                    </Text>
                                ))}
                            </>
                        )}

                        {/* 부정적 의견 */}
                        {Array.isArray(pastEventsData.feedback.contents.negative) && pastEventsData.feedback.contents.negative.length > 0 && (
                            <>
                                <Text style={styles.sentimentTitleNegative}>부정의견</Text>
                                {pastEventsData.feedback.contents.negative.map((item: FeedbackItem, index: number) => (
                                    <Text key={index} style={styles.feedbackText}>
                                        • [{item.title} : {item.description}]
                                    </Text>
                                ))}
                            </>
                        )}
                    </View>
                )}
            </View>
        );
    };


    return (
        <SafeAreaView style={styles.safeArea}>

            {/* <Stack.Screen options={{ headerShown: false }} /> // Stack.Screen은 현재 환경에서 주석 처리 */}

            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

                {/* 상단 헤더: 상세뷰에서만 표시 (HomeDetailView에서는 현재의 상세 데이터 전달) */}
                <SharedEventHeader data={currentData} imageData={imageData} />

                {/* 콘텐츠 영역 (탭과 내용) */}
                <View style={styles.contentArea}>

                    {/* 탭 */}
                    <View style={styles.tabContainer}>
                        {["행사예매/입장", "특전/굿즈", "과거행사기록"].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={{
                                    paddingBottom: 8,
                                    marginRight: 20,
                                    borderBottomWidth: tab === activeTab ? 2 : 0,
                                    borderColor: '#FF59AD',
                                }}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={tab === activeTab ? styles.tabTextActive : styles.tabTextInactive}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* 조건부 콘텐츠: 행사예매/입장 (이미지 f3b2a3.png 반영) */}
                    {activeTab === "행사예매/입장" && (
                        <View>
                            {/* 예매정보 */}
                            <View style={styles.infoSection}>
                                <Text style={styles.sectionTitle}>예매정보</Text>
                                <Text style={styles.sectionDescription}>행사 예매 및 참석과 관련된 정보에요.</Text>
                                <View style={styles.tabContentSeparator} />
                                <View style={styles.detailList}>
                                    {/* 정책 3: 예매정보 정리 */}
                                    {isNoReservationRequired ? (
                                        <Text style={styles.detailItem}>**예약이 필요없다**</Text>
                                    ) : (
                                        <>
                                            {/* 정책 3-1: 예약/예매일: YYYY-MM-DD HH:MM */}
                                            <Text style={styles.detailItem}>
                                                예매 오픈일: **{reservationInfo?.open_date || "YYYY-MM-DD HH:MM"}**
                                            </Text>
                                            {/* 정책 3-2: 예약 방법: [어디에서 / 어떻게] */}
                                            <Text style={styles.detailItem}>
                                                예매 방식: **{reservationInfo?.method || "정보 없음"}**
                                            </Text>
                                            {/* 정책 3-3: 예매 시 주의사항 */}
                                            <Text style={styles.detailItem}>
                                                예매 시 주의사항: {reservationInfo?.notes || "정보 없음"}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </View>

                            {/* 입장 안내 */}
                            <View style={styles.infoSection}>
                                <Text style={styles.sectionTitle}>입장안내</Text>
                                <Text style={styles.sectionDescription}>행사 입장 시 알아야 하는 정보들을 모아봤어요.</Text>
                                <View style={styles.tabContentSeparator} />
                                <View style={styles.detailList}>
                                    {/* 정책 4-1: 입장시간 */}
                                    <Text style={styles.detailItem}>
                                        입장시간: **{getEntryTime(currentData.entrance_info?.entry_time, currentData.event_overview?.daily_hours)}**
                                    </Text>
                                    {/* 정책 4-2: 입장방식 (별도 기재된 내용이 없을 시 표시하지 않음) */}
                                    {currentData.entrance_info?.entry_method &&
                                        currentData.entrance_info.entry_method.trim() !== "" &&
                                        currentData.entrance_info.entry_method.trim() !== "정보 없음" && (
                                            <Text style={styles.detailItem}>
                                                입장방식: {currentData.entrance_info.entry_method}
                                            </Text>
                                        )}
                                    {/* 정책 4-3: 입장 준비물 */}
                                    <Text style={styles.detailItem}>
                                        입장 준비물: **{currentData.entrance_info?.entry_items?.join(" / ") || "정보 없음"}**
                                    </Text>
                                    {/* 정책 4-4: 운영시간 (정책에 따라 명시적으로 추가) */}
                                    <Text style={styles.detailItem}>
                                        운영시간: {currentData.event_overview?.daily_hours || "정보 없음"}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* 조건부 콘텐츠: 특전/굿즈 */}
                    {activeTab === "특전/굿즈" && renderBenefitGoodsTab()}

                    {/* 조건부 콘텐츠: 과거행사기록 */}
                    {activeTab === "과거행사기록" && renderPastEventTab()}
                </View>

            </ScrollView>

        </SafeAreaView>
    );
};


const styles = StyleSheet.create({
    // --- 사용자가 제공한 상단 UI 스타일은 `SharedEventHeader`로 이동하여 재사용합니다 ---
    safeArea: { flex: 1, backgroundColor: "#fff" }, // 배경색 변경됨

    // --- 기존 하단 및 컨텐츠 스타일 (유지) ---
    contentArea: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 33,
        paddingBottom: 20,
        marginTop: -12,
        zIndex: 1,
        overflow: 'hidden',
    },

    // Tab Style
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        marginBottom: 24,
    },
    tabTextActive: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FF59AD',
    },
    tabTextInactive: {
        fontSize: 14,
        fontWeight: '500',
        color: '#9E9E9E',
    },

    // Section Headers
    infoSection: { marginBottom: 32 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 4 },
    sectionDescription: { fontSize: 12, color: '#9E9E9E', marginBottom: 0 },
    tabContentSeparator: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 16 },
    detailList: { paddingLeft: 0 },
    detailItem: { marginBottom: 8, fontSize: 14, color: '#333', lineHeight: 20 },

    // Content Style
    contentItem: { marginBottom: 16 },
    contentTitle: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 4 },
    contentDescription: { fontSize: 13, color: '#616161', lineHeight: 18 },

    // 특전/굿즈 스타일
    itemNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center'
    },
    itemNumberText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700'
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    benefitText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        lineHeight: 20,
    },
    goodsItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 20,
    },
    goodsInfo: { flex: 1 },
    goodsName: { fontSize: 14, fontWeight: '600', color: '#000' },
    goodsPrice: { fontSize: 13, color: '#616161', marginTop: 4 },
    goodsImage: { width: 50, height: 50, borderRadius: 8 },
    addToCartMock: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F7F7F7',
        borderRadius: 10,
        marginTop: 10,
    },
    addToCartText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    addToCartLink: {
        fontSize: 14,
        color: '#FF59AD',
        fontWeight: '600',
        marginLeft: 4,
    },

    // 과거 행사 기록 스타일 (정책 4)
    pastEventTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    pastEventDescription: {
        fontSize: 12,
        color: '#9E9E9E',
        marginBottom: 20,
    },
    pastEventList: {
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        overflow: 'hidden',
    },
    pastEventItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#fff',
    },
    pastEventName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
        flexShrink: 1,
        marginRight: 10,
    },
    pastEventLink: {
        fontSize: 12,
        color: '#9E9E9E',
        fontWeight: '500',
        marginRight: 4,
    },
    feedbackSection: {
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    feedbackSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 10,
    },
    feedbackSectionTitlePink: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FF59AD', // 핑크색 적용
        marginBottom: 10,
    },
    sentimentTitlePositive: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF', // 파란색 (긍정)
        marginTop: 8,
        marginBottom: 4,
        marginLeft: 5,
    },
    sentimentTitleNegative: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF3B30', // 빨간색 (부정)
        marginTop: 12,
        marginBottom: 4,
        marginLeft: 5,
    },
    feedbackText: {
        fontSize: 13,
        color: '#333',
        lineHeight: 20,
        marginLeft: 10,
    }
});

export default HomeDetailView;