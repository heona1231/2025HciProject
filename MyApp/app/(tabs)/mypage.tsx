// app/(tabs)/mypage.tsx
import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import SharedEventHeader from '../components/SharedEventHeader';
import { useEventContext } from '../context/EventContext';

// =========================================================
// 💡 MyPage 컴포넌트 시작
// =========================================================
export default function MyPage() {
// <<<<<<< mypage2
//     // --- EventContext에서 현재 이벤트 데이터 가져오기 ---
//     const { eventData, imageAnalysisData } = useEventContext();
//     // 초기값: 로딩 중 (eventData가 있을 때까지)
//     const [isLoadingStockInfo, setIsLoadingStockInfo] = useState(eventData ? true : false);
    
//     // eventData 변경 시: goods_stock_info가 로드되면 로딩 해제
//     React.useEffect(() => {
//         if (eventData?.goods_stock_info && eventData.goods_stock_info.length > 0) {
//             setIsLoadingStockInfo(false);
//         }
//     }, [eventData?.goods_stock_info]);

//     // --- 1. MyPage 기존 데이터 및 로직 (굿즈 목록) ---
//     // 컨텍스트에서 굿즈 데이터를 가져오고, 없으면 기본 목 데이터 사용
//     const defaultGoods = [
//         { id: 1, name: '아크릴 키링', price: 8000, image: 'https://via.placeholder.com/100', keyword: '춘식이/아크릴', searchCount: 52000 },
//         { id: 2, name: '포토카드 세트', price: 12000, image: 'https://via.placeholder.com/100', keyword: '라이언/지류', searchCount: 15000 },
//         { id: 3, name: '스터커 팩', price: 5000, image: 'https://via.placeholder.com/100', keyword: '어피치/지류', searchCount: 8500 },
//     ];

//     // goods_popularity_rank가 있으면 우선 사용 (검색량 순위 기반)
//     let goods = defaultGoods;
//     if (eventData?.goods_popularity_rank && eventData.goods_popularity_rank.length > 0) {
//         goods = eventData.goods_popularity_rank.map((rank) => ({
//             id: rank.rank,
//             name: rank.goods_name,
//             price: 0,
//             image: 'https://via.placeholder.com/100',
//             keyword: rank.goods_name,
//             searchCount: rank.search_count || 0
//         }));
//     } else if (eventData?.goods_list && eventData.goods_list.length > 0) {
//         // goods_popularity_rank가 없으면 goods_list 사용
//         goods = eventData.goods_list.slice(0, 3).map((g, idx) => ({
//             id: idx + 1,
//             name: g.goods_name,
//             price: parseInt(String(g.price || '').replace(/[^0-9]/g, '')) || 0,
//             image: 'https://via.placeholder.com/100',
//             keyword: g.goods_name,
//             searchCount: 0
//         }));
//     }

//     // --- 추가: 검색량/인기도 추정 (A: 검색량 지표, B: 소셜/이미지 기반 신호 혼합) ---
//     // imageAnalysisData.uploaded_images 또는 eventData.uploaded_images를 소셜/관심 신호로 사용
//     const uploadedCount = (imageAnalysisData?.uploaded_images?.length || eventData?.uploaded_images?.length || 0);

//     // derivedGoods: 화면에 사용할 최대 3개의 굿즈에 대해 blended searchCount 및 popularityScore 추가
//     const derivedGoods = goods.slice(0, 3).map((item, idx) => {
//         // A: 트렌드/검색량 (있다면 사용)
//         const trendCount = (item.searchCount && typeof item.searchCount === 'number') ? item.searchCount : 0;

//         // B: 소셜/이미지 신호 (업로드된 이미지 수에 비례하는 단순한 proxy)
//         const socialSignal = uploadedCount * 500; // 1 image -> 500 검색량 가중치 (휴리스틱)

//         // 가중 혼합 (70% 트렌드, 30% 소셜)
//         const blended = Math.round(trendCount * 0.7 + socialSignal * 0.3);

//         // 인간 친화적 표기: '약 N천 건' -> k 단위 (rounded)
//         const approxK = Math.max(0, Math.round(blended / 1000));

//         return {
//             ...item,
//             searchCount: blended,
//             searchApproxK: approxK,
//         };
//     });

//     const [priorities, setPriorities] = useState(["1", "2", "3"]);
// =======
    // --- 1. EventContext에서 굿즈 목록 가져오기 ---
    const { myGoods } = useEventContext();
    const goods = myGoods;
    
    const [priorities, setPriorities] = useState<string[]>(
        goods.map((_, index) => String((index % 3) + 1))
    );

    // 💡 굿즈 목록이 변경될 때마다 priorities 업데이트
    useEffect(() => {
        setPriorities(goods.map((_, index) => String((index % 3) + 1)));
    }, [goods.length]);

    const updatePriority = (index: number, newValue: string) => {
        const oldValue = priorities[index];
        if (oldValue === newValue) { return; }
        const updated = [...priorities];
        const targetIndex = priorities.findIndex((p, i) => p === newValue && i !== index);
        updated[index] = newValue;
        if (targetIndex !== -1) { updated[targetIndex] = oldValue; }
        setPriorities(updated);
    };

    // Header is rendered via SharedEventHeader (reads from EventContext)

    // --- 3. 렌더링: 상단 UI + 나의 굿즈 목록 ---
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>

                {/* Shared header (shared between home and mypage) */}
                <SharedEventHeader />

                {/* '나의 굿즈 목록' 콘텐츠 영역 */}
                <View style={styles.contentArea}>
                    <View style={[styles.frame, {gap:34}]}>
                        <View style={[styles.frame, {gap:4}]}>
                            <Text style={styles.head2}>구매하려는 굿즈 목록</Text>
                            <Text style={styles.caption1}>구매하려는 굿즈 목록을 정리해두었어요!</Text>
                        </View>
                        
                        {/* 굿즈목록 */}
                        <View style={[styles.goodsList]}>
                        {derivedGoods.map((item, index) => (
                            <View key={item.id} style={styles.goods}>
                                <View style={styles.numberCircle}><Text style={[styles.caption1, {color:"white"}]}>{index + 1}</Text></View>
                                
                                <Image source={typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('file') || item.image.startsWith('data')) ? { uri: item.image } : require("../../assets/logo.png")} style={styles.image} resizeMode="contain"/>
                                
                                <View style={styles.goodsText}>
                                    <Text style={styles.caption1}>{item.name}</Text>
                                    <Text style={styles.caption2}>{(item.price || 0).toLocaleString()}원</Text>
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
                            {derivedGoods.map((item, index) => (
                                <View key={item.id} style={styles.goodsRibbon}>
                                    <View style={styles.ribbon}>
                                        <Image source={require("../../assets/ribbon.png")}
                                            style={styles.ribbonImage} 
                                            resizeMode="contain"/>
                                        <Text style={styles.ribbonText}>
                                            {index + 1}</Text>
                                    </View>

                                    <View style={styles.circularImageContainer}>
                                            <Image 
                                                source={typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('file') || item.image.startsWith('data')) ? { uri: item.image } : require("../../assets/logo.png")}
                                            style={styles.circularImage} 
                                            resizeMode="contain"/>
                                    </View>

                                    <Text style={styles.caption1}>{item.name}</Text>
                                </View>))}
                        </View>
                        
                        <View style={[styles.frame, {gap:12}]}>
                            <Text style={[styles.caption1, {color:"#FF59AD"}]}>지난 행사 굿즈 품절정보</Text>
                            {eventData?.goods_stock_info && eventData.goods_stock_info.length > 0 ? (
                                <View style={[styles.frame, {gap:12}]}>
                                    {eventData.goods_stock_info.slice(0, 3).map((stock: any, idx: number) => {
                                        // 해당 굿즈 인덱스의 이미지 가져오기
                                        const uploadedImgs = eventData.uploaded_images || [];
                                        const userImg = uploadedImgs[idx] || null;

                                        return (
                                            <View key={idx} style={styles.stockInfoItem}>
                                                {/* 이미지 */}
                                                {userImg && (
                                                    <Image source={{ uri: userImg }} style={styles.stockImage} resizeMode="cover" />
                                                )}
                                                
                                                {/* 텍스트 정보 */}
                                                <View style={styles.stockTextContainer}>
                                                    <Text style={styles.caption1}>{stock.goods_name}</Text>
                                                    <Text style={styles.caption2}>
                                                        {stock.sold_out_minutes}분 만에 품절
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            ) : isLoadingStockInfo ? (
                                <View style={[styles.frame, {gap:4}]}>
                                    <Text style={styles.caption1}>정보를 불러오는 중입니다...</Text>
                                </View>
                            ) : (
                                <View style={[styles.frame, {gap:4}]}>
                                    <Text style={styles.caption1}>품절 정보를 찾을 수 없습니다.</Text>
                                </View>
                            )}
                        </View>

                        <View style={[styles.frame, {gap:20}]}>
                            <View style={[styles.frame, {gap:4}]}>
                                <Text style={[styles.caption1, {color:"#FF59AD"}]}>검색량 순위</Text>
                                <Text style={styles.caption2}>X, 커뮤니티, 웹 정보를 기반으로 하여 인기 순위를 알려드릴게요.</Text>
                            </View>

                            <View style={[styles.goodsList]}>
                                {eventData?.goods_popularity_rank && eventData.goods_popularity_rank.length > 0 ? (
                                    // 컨텍스트의 popularity_rank 데이터 사용 (이미 정렬됨)
                                    eventData.goods_popularity_rank.slice(0, 3).map((rank: any, index: number) => (
                                        <View key={index} style={styles.goods}>
                                            <View style={styles.numberCircle}>
                                                <Text style={[styles.caption1, { color: "white" }]}>{rank.rank}</Text>
                                            </View>


                                    <Image source={typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('file') || item.image.startsWith('data')) ? { uri: item.image } : require("../../assets/logo.png")} style={styles.image} resizeMode="contain" />

                                            <View style={styles.goodsText}>
                                                <Text style={styles.caption1}>{rank.goods_name}</Text>
                                                <Text style={styles.caption2}>검색 결과 {" "}
                                                    <Text style={{ color: '#FF59AD', fontWeight: 'bold' }}>{rank.search_count.toLocaleString()}</Text>
                                                개</Text>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    // 폴백: derivedGoods를 searchCount로 정렬하여 상위 3개만 표시
                                    [...derivedGoods].sort((a, b) => b.searchCount - a.searchCount).slice(0, 3).map((item: any, index: number) => (
                                        <View key={item.id} style={styles.goods}>
                                            <View style={styles.numberCircle}>
                                                <Text style={[styles.caption1, { color: "white" }]}>{index + 1}</Text>
                                            </View>

                                            <Image source={require("../../assets/logo.png")} style={styles.image} resizeMode="contain" />

                                            <View style={styles.goodsText}>
                                                <Text style={styles.caption1}>{item.name}</Text>
                                                <Text style={styles.caption2}>검색 결과 {" "}
                                                    <Text style={{ color: '#FF59AD', fontWeight: 'bold' }}>{item.searchCount.toLocaleString()}</Text>
                                                개 (약 {item.searchApproxK}k)</Text>
                                            </View>
                                        </View>
                                    ))
                                )}
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
    stockInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12 },
    stockImage: { width: 60, height: 60, borderRadius: 8 },
    stockTextContainer: { flex: 1, gap: 4 },
});