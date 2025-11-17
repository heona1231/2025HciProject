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
    const sortedGoodsByCount = [...goods].sort((a, b) => b.searchCount - a.searchCount);

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
                        {goods.map((item, index) => (
                            <View key={item.id} style={styles.goods}>
                                <View style={styles.numberCircle}><Text style={[styles.caption1, {color:"white"}]}>{index + 1}</Text></View>
                                
                                <Image source={typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('file') || item.image.startsWith('data')) ? { uri: item.image } : require("../../assets/logo.png")} style={styles.image} resizeMode="contain"/>
                                
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

                                    <Image source={typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('file') || item.image.startsWith('data')) ? { uri: item.image } : require("../../assets/logo.png")} style={styles.image} resizeMode="contain" />

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