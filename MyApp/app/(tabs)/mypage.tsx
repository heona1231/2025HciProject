// app/(tabs)/mypage.tsx
import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import SharedEventHeader from '../components/SharedEventHeader';
import { useEventContext } from '../context/EventContext';

interface MyGoodsItem {
    id: number;
    name: string;
    price: number;
    image: string;
    searchCount?: number; 
}

export default function MyPage() {
    const { myGoods, eventTitle, goodsStockoutInfo, setGoodsStockoutInfo } = useEventContext();
    const goods: MyGoodsItem[] = myGoods;

    
    // 첫 번째 굿즈 품절 상태 (20초 타이머)
    const [isFirstItemSoldOut, setIsFirstItemSoldOut] = useState(false);
    const [priorities, setPriorities] = useState<string[]>(
        goods.map((_, index) => String((index % 3) + 1))
    );
    const [loadingStockout, setLoadingStockout] = useState(false);

    // 굿즈 목록 변경 시 priorities 업데이트
    useEffect(() => {
        setPriorities(goods.map((_, index) => String((index % 3) + 1)));
    }, [goods.length]);

    // 20초 후 첫 번째 굿즈 품절 처리
    useEffect(() => {
        const timer = setTimeout(() => {
            if (goods.length > 0) {
                setIsFirstItemSoldOut(true);
            }
        }, 20000);
        return () => clearTimeout(timer);
    }, [goods.length]);

    // 과거 행사 품절 정보 가져오기
    useEffect(() => {
        if (eventTitle && goods.length > 0 && !goodsStockoutInfo) {
            fetchPastEventStockoutInfo();
        }
    }, [eventTitle, goods.length]);

    const fetchPastEventStockoutInfo = async () => {
        if (loadingStockout) return;
        
        setLoadingStockout(true);
        try {
            const response = await fetch('http://localhost:4000/search-past-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_title: eventTitle })
            });

            if (!response.ok) {
                throw new Error('과거 행사 정보를 가져오는데 실패했습니다.');
            }

            const data = await response.json();
            
            if (data.success && data.pastEvents) {
                const stockoutText = extractStockoutInfo(data.pastEvents);
                setGoodsStockoutInfo(stockoutText);
            }
        } catch (error) {
            console.error('품절 정보 로딩 오류:', error);
            setGoodsStockoutInfo("품절 정보를 불러올 수 없습니다.");
        } finally {
            setLoadingStockout(false);
        }
    };

    // 품절이 포함된 문장 2개만 추출
    const extractStockoutInfo = (pastEvents: any): string => {
        const feedback = pastEvents?.feedback;
        
        if (!feedback || !feedback.goods || feedback.goods.length === 0) {
            return "이전 행사 품절 정보가 없습니다.";
        }

        // 품절이 포함된 description만 필터링
        const stockoutSentences = feedback.goods
            .filter((item: any) => item.description && item.description.includes('품절'))
            .map((item: any) => item.description)
            .slice(0, 2); // 최대 2개만

        if (stockoutSentences.length === 0) {
            return "이전 행사에서 품절된 굿즈가 없었습니다.";
        }

        return stockoutSentences.join('\n\n');
    };

    // 임의 검색량 생성 함수
    const generateRandomSearchCount = (index: number): number => {
        const seed = goods[index]?.id || index;
        const baseCount = 1000;
        const maxCount = 50000;
        const randomFactor = (seed * 9301 + 49297) % 233280;
        const searchCount = baseCount + (randomFactor % (maxCount - baseCount));
        
        return Math.floor(searchCount);
    };

    // 굿즈에 검색량 추가
    const goodsWithSearchCount: MyGoodsItem[] = goods.map((item, index) => ({
        ...item,
        searchCount: item.searchCount || generateRandomSearchCount(index)
    }));

    const updatePriority = (index: number, newValue: string) => {
        const oldValue = priorities[index];
        if (oldValue === newValue) { return; }
        const updated = [...priorities];
        const targetIndex = priorities.findIndex((p, i) => p === newValue && i !== index);
        updated[index] = newValue;
        if (targetIndex !== -1) { updated[targetIndex] = oldValue; }
        setPriorities(updated);
    };

    // 검색량 순으로 정렬
    const sortedGoodsByCount: MyGoodsItem[] = [...goodsWithSearchCount].sort((a, b) => (b.searchCount || 0) - (a.searchCount || 0));

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>

                <SharedEventHeader />

                <View style={styles.contentArea}>
                    <View style={[styles.frame, {gap:34}]}>
                        <View style={[styles.frame, {gap:4}]}>
                            <Text style={styles.head2}>구매하려는 굿즈 목록</Text>
                            <Text style={styles.caption1}>구매하려는 굿즈 목록을 정리해두었어요!</Text>
                        </View>
                        
                        {/* 굿즈목록 */}
                        <View style={[styles.goodsList]}>
                        {goodsWithSearchCount.map((item, index) => (
                            <View key={item.id} style={styles.goods}>
                                
                                {/* 품절 오버레이 */}
                                {index === 0 && isFirstItemSoldOut && (
                                    <View style={styles.soldOutOverlay}>
                                        <Text style={styles.soldOutText}>품절되었어요.</Text>
                                    </View>
                                )}
                                
                                <View style={styles.numberCircle}><Text style={[styles.caption1, {color:"white"}]}>{index + 1}</Text></View>
                                
                                <Image 
                                    source={typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('file') || item.image.startsWith('data')) ? { uri: item.image } : require("../../assets/logo.png")} 
                                    style={styles.image} 
                                    resizeMode="contain"
                                />
                                
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

                        {/* 굿즈 인기도 정보 */}
                        <View style={[styles.frame, {gap:4}]}>
                            <Text style={styles.head2}>굿즈 인기도 정보</Text>
                            <Text style={styles.caption1}>각 굿즈 관련 키워드 검색량, 게시글 수에 따라{"\n"}구매 가능성이 높은 순위를 말씀드려요.</Text>
                        </View>

                        <View style={styles.goodsRibbonList}>
                            {goodsWithSearchCount.slice(0, 3).reverse().map((item, index) => (
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
                        
                        {/* AI 기반 품절 정보 섹션 */}
                        <View style={[styles.frame, {gap:12}]}>
                            <Text style={[styles.caption1, {color:"#FF59AD"}]}>지난 행사 굿즈 품절정보</Text>
                            <View style={[styles.frame, {gap:4}]}>
                                {loadingStockout ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#FF59AD" />
                                        <Text style={[styles.caption2, {marginLeft: 8}]}>품절 정보 분석 중...</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.frame, { gap: 8 }]}>
                                        {goodsStockoutInfo ? (
                                            goodsStockoutInfo.split('\n\n').map((paragraph, index) => (
                                                <Text key={index} style={styles.caption1}>
                                                    {paragraph}
                                                </Text>
                                            ))
                                        ) : (
                                            <Text style={styles.caption1}>품절 정보를 불러오는 중입니다.</Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* 검색량 순위 섹션 */}
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

                                    <Image source={typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('file') || item.image.startsWith('data')) ? { uri: item.image } : require("../../assets/logo.png")} style={styles.image} resizeMode="contain" />

                                    <View style={styles.goodsText}>
                                        <Text style={styles.caption1}>{item.name}</Text>
                                        <Text style={styles.caption2}>검색 결과 {" "}
                                            <Text style={{ color: '#FF59AD', fontWeight: 'bold' }}>{item.searchCount?.toLocaleString()}</Text>
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

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#fff" }, 
    imageBackgroundContainer: { height: 480, width: '100%', overflow: 'hidden', position: 'relative' },
    transparentOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
    eventImage: { width: 219, height: 274, position: 'absolute', top: 162, left: '50%', marginLeft: -109 },
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
    contentArea: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 33, paddingBottom: 20, marginTop: -12, zIndex: 1, overflow: 'hidden' },
    frame:{ alignItems: "flex-start", justifyContent: "flex-start", gap: 10 },
    divider: { width: "100%", height: 1, backgroundColor: "#E0E0E0", marginVertical: 10 },
    goodsList:{ alignItems: "flex-start", justifyContent: "flex-start", gap: 20, width:"100%" },
    goodsText:{ alignItems: "flex-start", justifyContent: "flex-start", gap: 4, flex: 1 },
    goods:{ 
        height: 64, 
        flexDirection: 'row', 
        alignItems: "center", 
        gap: 16, 
        justifyContent: "flex-start", 
        width:"100%", 
        position: 'relative'
    },
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
    loadingContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    soldOutOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
        borderRadius: 0,
    },
    soldOutText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white',
    },
});