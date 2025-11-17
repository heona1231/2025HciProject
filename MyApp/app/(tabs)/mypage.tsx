// app/(tabs)/mypage.tsx
import React, { useState } from "react";
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";

// =========================================================
// 💡 상단 UI 렌더링을 위한 최소한의 헬퍼 함수 및 데이터
// =========================================================

// 최소한의 EventData Mock (상단 UI 표시용)
const minimalEventData: any = {
    event_title: "간나디 랜덤 전시회",
    event_overview: {
        address: "일산 킨텍스 제2전시장 9, 10홀/경기도 고양시 일산서구 킨텍스로 217-60",
        date_range: "2025-11-20 10:00~2025-11-23 18:00",
        duration_days: 4,
        daily_hours: "(월)10:00~18:00/(화)11:00~15:00"
    },
    reservation_info: {
        open_date: "2025-10-30 14:00",
        method: "티켓링크",
        notes: "1인당 2매 한정"
    },
};

const events = ["행사 1", "행사 2", "행사 3"]; // 드롭다운 콘텐츠용

// D-Day 및 날짜 포맷팅에 필요한 최소한의 헬퍼 함수들
const pad = (num: number): string => (num < 10 ? `0${num}` : `${num}`);

const formatAddress = (address: string | undefined): string => {
    if (!address) return "정보 없음";
    const parts = address.split("/");
    const placeName = parts[0] ? parts[0].trim() : "장소 미상";
    const roadAddress = parts[1] ? parts[1].trim() : "주소 미상";
    return `${placeName} (${roadAddress})`;
};

const formatDate = (dateRange: string | undefined): string => {
    if (!dateRange || !dateRange.includes('~')) { return "정보 없음"; }
    const [startDateTimeStr] = dateRange.split('~').map(s => s.trim());
    const startDate = new Date(startDateTimeStr.replace(/\./g, '-').replace(/\//g, '-'));
    if (isNaN(startDate.getTime())) { return "정보 없음"; }
    const startDay = ['일', '월', '화', '수', '목', '금', '토'][startDate.getDay()];
    const startFormatted = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())} ${pad(startDate.getHours())}:${pad(startDate.getMinutes())}(${startDay})`;
    return startFormatted;
};

const calculateDDay = (dateStr: string | undefined, type: '예약' | '행사'): { dday: string; date: string } => {
    if (!dateStr || dateStr.length < 10 || dateStr === "YYYY-MM-DD HH:MM") {
        return { dday: "D-?", date: type === '예약' ? "예약일 미정" : "행사일 미정" };
    }
    const targetDate = new Date(dateStr.substring(0, 10).replace(/\./g, '-'));
    if (isNaN(targetDate.getTime())) { return { dday: "D-?", date: type === '예약' ? "예약일 미정" : "행사일 미정" }; }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const dateFormatted = dateStr.substring(0, 10).replace(/-/g, '.');
    let dday: string;
    if (diffDays === 0) { dday = "D-DAY"; } 
    else if (diffDays > 0) { dday = `D-${diffDays}`; } 
    else { dday = "종료"; }
    return { dday, date: dateFormatted };
};

const getLocalImage = (name: string) => {
    // 실제 로컬 에셋 경로를 가정하고, 이름에 따라 다른 이미지를 반환합니다.
    switch (name) {
        case "ganadi.png": return require("../../assets/logo.png"); // 임시
        case "logoWhite.png": return require("../../assets/logo.png"); // 임시
        case "arrowdown.png": return require("../../assets/logo.png"); // 임시
        default: return require("../../assets/logo.png"); // 기본 대체 이미지
    }
};

// =========================================================
// 💡 MyPage 컴포넌트 시작
// =========================================================
export default function MyPage() {
    // --- 1. MyPage 기존 데이터 및 로직 (굿즈 목록) ---
    const goods = [
        { id: 1, name: '아크릴 키링', price: 8000, image: 'https://via.placeholder.com/100', keyword: '춘식이/아크릴', searchCount: 52000 },
        { id: 2, name: '포토카드 세트', price: 12000, image: 'https://via.placeholder.com/100', keyword: '라이언/지류', searchCount: 15000 },
        { id: 3, name: '스터커 팩', price: 5000, image: 'https://via.placeholder.com/100', keyword: '어피치/지류', searchCount: 38000 },
    ];
    const [priorities, setPriorities] = useState(["1", "2", "3"]);
    const updatePriority = (index: number, newValue: string) => {
        const oldValue = priorities[index];
        if (oldValue === newValue) { return; }
        const updated = [...priorities];
        const targetIndex = priorities.findIndex((p, i) => p === newValue && i !== index);
        updated[index] = newValue;
        if (targetIndex !== -1) { updated[targetIndex] = oldValue; }
        setPriorities(updated);
    };
    const sortedGoodsByCount = [...goods].sort((a, b) => b.searchCount - a.searchCount);

    // --- 2. HomeDetailView 상단 UI 상태 및 데이터 ---
    const [currentData, setCurrentData] = useState<any>(minimalEventData);
    const [open, setOpen] = useState(false); // 드롭다운 상태

    // D-Day 계산에 필요한 변수들
    const reservationInfo = currentData.reservation_info;
    const isNoReservationRequired =
        !reservationInfo ||
        (
            (!reservationInfo.open_date || reservationInfo.open_date.trim() === "YYYY-MM-DD HH:MM") &&
            (!reservationInfo.method || reservationInfo.method.trim() === "정보 없음" || reservationInfo.method.trim() === "") &&
            (!reservationInfo.notes || reservationInfo.notes.trim() === "정보 없음" || reservationInfo.notes.trim() === "")
        );
    const { dday: reservationDDay, date: reservationDate } = calculateDDay(currentData.reservation_info?.open_date, '예약');
    const eventStartDateStr = currentData.event_overview?.date_range?.split('~')[0]?.trim();
    const { dday: eventDDay, date: eventDate } = calculateDDay(eventStartDateStr, '행사');

    // --- 3. 렌더링: 상단 UI + 나의 굿즈 목록 ---
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>

                {/* HomeDetailView 상단 UI (Image, Dropdown, Title) */}
                <View style={styles.imageBackgroundContainer}>
                    {/* 배경 이미지 */}
                    <Image source={getLocalImage("ganadi.png")} style={styles.eventImage} resizeMode="cover"/>
                    
                    {/* ✨ 투명한 검은색 배경 오버레이 추가 ✨ */}
                    <View style={styles.transparentOverlay} />
                    
                    {/* 로고 (Z-Index가 높아야 함) */}
                    <Image source={getLocalImage("logoWhite.png")} style={styles.logo} resizeMode="contain"/>
                    {/* 드롭다운 Wrapper */}
                    <View style={styles.dropdownWrapper}>
                        <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(!open)} activeOpacity={0.8}>
                            <Text style={styles.dropdownText}>{currentData.event_title || "행사 정보 없음"}</Text>
                            <Image source={getLocalImage("arrowdown.png")}
                                style={[styles.iconArrowBottom242, open && { transform: [{ rotate: '180deg' }] }]}
                            />
                        </TouchableOpacity>
                        {open && (
                            <View style={styles.dropdownList}>
                                {events.filter(e => e !== currentData.event_title).map((item, idx) => (
                                    <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => { setOpen(false); Alert.alert("알림", `${item} 선택됨`); }} activeOpacity={0.7}>
                                        <Text style={styles.dropdownItemText}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                    {/* 상단 텍스트 오버레이 */}
                    <View style={styles.overlayContent}>
                        <Text style={styles.mainTitle}>{currentData.event_title || "행사명 미정"}</Text>
                        <Text style={styles.ddayText}>
                            {isNoReservationRequired ? (
                                <>
                                    <Text style={styles.preRegistration}>행사 시작</Text>
                                    <Text style={styles.ddayValue}> {eventDDay} ({eventDate})</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.preRegistration}>예약 마감</Text>
                                    <Text style={styles.ddayValue}> {reservationDDay} ({reservationDate})</Text>
                                </>
                            )}
                        </Text>
                        <View style={styles.ul}>
                            <Text style={styles.li}>주소: {formatAddress(currentData.event_overview?.address)}</Text>
                            <Text style={styles.li}>
                                일시: {formatDate(currentData.event_overview?.date_range)}
                                {currentData.event_overview?.duration_days ? ` (${currentData.event_overview.duration_days}일간)` : ""}
                            </Text>
                            <Text style={styles.li}>운영시간: {currentData.event_overview?.daily_hours || "정보 없음"}</Text>
                        </View>
                    </View>
                </View>

                {/* '나의 굿즈 목록' 콘텐츠 영역 */}
                <View style={styles.contentArea}>
                    <View style={[styles.frame, {gap:34}]}>
                        <View style={[styles.frame, {gap:4}]}>
                            <Text style={styles.head2}>구매하려는 굿즈 목록</Text>
                            <Text style={styles.caption1}>구매하려는 굿즈 목록을 정리해두었어요!</Text>
                        </View>
                        
                        {/* 굿즈목록 */}
                        <View style={[styles.goodsList]}>
                        {goods.map((item, index) => (
                            <View key={item.id} style={styles.goods}>
                                <View style={styles.numberCircle}><Text style={[styles.caption1, {color:"white"}]}>{index + 1}</Text></View>
                                
                                <Image source={require("../../assets/logo.png")} style={styles.image} resizeMode="contain"/>              
                                
                                <View style={styles.goodsText}>
                                    <Text style={styles.caption1}>{item.name}</Text>
                                    <Text style={styles.caption2}>{item.price.toLocaleString()}원</Text>
                                </View>
                                
                                <View style={styles.selectBox}>
                                    <Picker
                                        selectedValue={priorities[index]}
                                        style={[styles.picker, priorities[index] === "1"
                                        ? { backgroundColor: "#FF59AD" } : { backgroundColor: "#CECECE" }]}
                                        dropdownIconColor="white"
                                        onValueChange={(value) => updatePriority(index, value)}>
                                        <Picker.Item label="1순위" value="1"/>
                                        <Picker.Item label="2순위" value="2"/>
                                        <Picker.Item label="3순위" value="3"/>
                                    </Picker>
                                </View>
                            </View>))}
                        </View>

                        <View style={styles.divider} />

                        <View style={[styles.frame, {gap:4}]}>
                            <Text style={styles.head2}>굿즈 인기도 정보</Text>
                            <Text style={styles.caption1}>각 굿즈 관련 키워드 검색량, 게시글 수에 따라{"\n"}구매 가능성이 높은 순위를 말씀드려요.</Text>
                        </View>

                        <View style={styles.goodsRibbonList}>
                            {goods.map((item, index) => (
                                <View key={item.id} style={styles.goodsRibbon}>
                                    <View style={styles.ribbon}>
                                        <Image source={require("../../assets/logo.png")} // ribbon.png 대체
                                            style={styles.ribbonImage} 
                                            resizeMode="contain"/>
                                        <Text style={styles.ribbonText}>
                                            {index + 1}</Text>
                                    </View>

                                    <View style={styles.circularImageContainer}>
                                        <Image 
                                            source={require("../../assets/logo.png")}
                                            style={styles.circularImage} 
                                            resizeMode="contain"/>
                                    </View>

                                    <Text style={styles.caption1}>{item.name}</Text>
                                </View>))}
                        </View>
                        
                        <View style={[styles.frame, {gap:12}]}>
                        <Text style={[styles.caption1, {color:"#FF59AD"}]}>지난 행사 굿즈 품절정보</Text>
                            <View style={[styles.frame, {gap:4}]}>
                                <Text style={styles.caption1}>저번 행사에서 ~관련된 상품이 가장 빨리 품절되었어요.{"\n"}
                                N분만에 상품명이 품절되었어요.</Text>
                            </View>
                        </View>

                        <View style={[styles.frame, {gap:20}]}>
                            <View style={[styles.frame, {gap:4}]}>
                                <Text style={[styles.caption1, {color:"#FF59AD"}]}>검색량 순위</Text>
                                <Text style={styles.caption2}>X, 커뮤니티, 웹 정보를 기반으로 하여 인기 순위를 알려드릴게요.</Text>
                            </View>

                            <View style={[styles.goodsList]}>
                            {sortedGoodsByCount.map((item, index) => (
                                <View key={item.id} style={styles.goods}>
                                    <View style={styles.numberCircle}>
                                        <Text style={[styles.caption1, { color: "white" }]}>{index + 1}</Text>
                                    </View>

                                    <Image source={require("../../assets/logo.png")} style={styles.image} resizeMode="contain" />

                                    <View style={styles.goodsText}>
                                        <Text style={styles.caption1}>{item.name}</Text>
                                        <Text style={styles.caption2}>검색 결과 {" "}
                                            <Text style={{ color: '#FF59AD', fontWeight: 'bold' }}>{item.searchCount.toLocaleString()}</Text>
                                        개</Text>
                                    </View>
                                </View>
                            ))}
                            </View>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// =========================================================
// 💡 스타일 (투명 오버레이 스타일 추가 및 불필요한 스타일 제거)
// =========================================================
const styles = StyleSheet.create({
    // --- 상단 UI 스타일 ---
    safeArea: { flex: 1, backgroundColor: "#fff" }, 
    imageBackgroundContainer: { height: 480, width: '100%', overflow: 'hidden', position: 'relative' },
    
    // ✨ 새로 추가된 투명한 검은색 오버레이 스타일 ✨
    transparentOverlay: {
        ...StyleSheet.absoluteFillObject, // 부모 View 전체를 덮음
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // 40% 투명한 검은색
    },

    eventImage: { width: 219, height: 274, position: 'absolute', top: 162, left: '50%', marginLeft: -109 },
    // eventImageCover (black.png) 스타일 제거됨

    logo: { width: 123, height: 22, marginBottom: 28, marginTop: 56, marginLeft: 16, zIndex: 10 },
    dropdownWrapper: { position: 'absolute', top: 100, left: 16, width: 328, zIndex: 10 },
    dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(239, 239, 239, 0.50)', height: 48, borderRadius: 12, paddingHorizontal: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    dropdownText: { fontSize: 12, color: '#616161', fontWeight: '600' },
    dropdownList: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, maxHeight: 200, overflow: 'hidden', zIndex: 20 },
    dropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    dropdownItemText: { fontSize: 14, color: '#444' },
    iconArrowBottom242: { width: 20, height: 20, tintColor: '#616161' },
    overlayContent: { position: 'absolute', top: 150, left: 16, right: 16, zIndex: 2 },
    mainTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8, marginTop: 119 },
    ddayText: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 24 },
    preRegistration: { color: '#fff', fontSize: 14 },
    ddayValue: { color: '#FF59AD', fontSize: 20, fontWeight: '700' },
    ul: { marginVertical: 8, paddingLeft: 0 },
    li: { marginBottom: 4, fontSize: 12, color: '#fff', lineHeight: 20 },

    // --- 굿즈 목록 스타일 ---
    contentArea: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 33, paddingBottom: 20, marginTop: -12, zIndex: 1, overflow: 'hidden' },
    frame:{ alignItems: "flex-start", justifyContent: "flex-start", gap: 10 },
    divider: { width: "100%", height: 1, backgroundColor: "#E0E0E0", marginVertical: 10 },
    goodsList:{ alignItems: "flex-start", justifyContent: "flex-start", gap: 20, width:"100%" },
    goodsText:{ alignItems: "flex-start", justifyContent: "flex-start", gap: 4, flex: 1 },
    goods:{ height: 64, flexDirection: 'row', alignItems: "center", gap: 16, justifyContent: "flex-start", width:"100%" },
    numberCircle: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
    image: { width: 64, height: 64, borderRadius: 10 },
    selectBox: { marginLeft:"auto", alignSelf: 'center', width: 63, height: 30, borderRadius: 10, justifyContent: "center" },
    picker: { color: "white", fontSize: 12, textAlign: "center", width: "100%", height: 30, borderWidth : 0, borderRadius: 10, justifyContent: "center" },
    goodsRibbonList:{ flexDirection: 'row', justifyContent: 'space-between', width: '80%', alignSelf: 'center', gap: 16 },
    goodsRibbon:{ alignItems: 'center', position: 'relative', width: 82, height: 104, flexShrink: 0 },
    circularImageContainer: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#EAEAEA', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    circularImage: { width: 78, height: 78, borderRadius: 39 },
    ribbon: { position: 'absolute', top: 0, left: 0, width: 18, height: 40, justifyContent: 'flex-start', alignItems: 'center', zIndex: 10 },
    ribbonImage: { width: '100%', height: '100%' },
    ribbonText: { position: 'absolute', color: 'white', fontSize: 10, top: 5, zIndex: 11 },
    head2: { fontSize: 20, fontWeight: "bold" },
    caption1: { fontSize: 14, color: "black", fontWeight: "600" },
    caption2: { fontSize: 12, color: "black", fontWeight: "600" },
});