// app/(tabs)/mypage.tsx
import React, { useState } from "react";
import { StyleSheet, View, Text, Image, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

export default function MyPage() {
  const goods = [
    { id: 1, name: '아크릴 키링', price: 8000, image: 'https://via.placeholder.com/100', keyword: '춘식이/아크릴', searchCount: 52000 },
    { id: 2, name: '포토카드 세트', price: 12000, image: 'https://via.placeholder.com/100', keyword: '라이언/지류', searchCount: 15000 },
    { id: 3, name: '스터커 팩', price: 5000, image: 'https://via.placeholder.com/100', keyword: '어피치/지류', searchCount: 38000 },
  ];

  const [priorities, setPriorities] = useState(["1", "2", "3"]);

  const updatePriority = (index: number, newValue: string) => {
    const oldValue = priorities[index];
    if (oldValue === newValue) {
      return;
    }

    const updated = [...priorities];
    const targetIndex = priorities.findIndex((p, i) => p === newValue && i !== index);
    updated[index] = newValue;
    if (targetIndex !== -1) {
      updated[targetIndex] = oldValue;
    }

    setPriorities(updated);
  };

  const sortedGoodsByCount = [...goods].sort((a, b) => b.searchCount - a.searchCount);
  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>마이페이지</Text>
      <View style={styles.mypageContainer}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.frame, {gap:34}, {paddingTop: 40}]}>
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
                  <Image source={require("../../assets/ribbon.png")} 
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
        </ScrollView>
        
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  mypageContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 16,
    paddingTop: 4,
    overflow :"hidden"
  },
  frame:{
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 10,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  
  goodsList:{
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 20,
    width:"100%"
  },
  goodsText:{
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 4,
    flex: 1
  },
  goods:{
    height: 64,
    flexDirection: 'row',
    alignItems: "center",
    gap: 16,
    justifyContent: "flex-start",
    width:"100%"
  },

  numberCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#000", 
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  selectBox: {
    marginLeft:"auto",
    alignSelf: 'center',
    width: 63,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
  },
  picker: {
    color: "white",
    fontSize: 12,
    textAlign: "center",
    width: "100%",
    height: 30,
    borderWidth : 0,
    borderRadius: 10,
    justifyContent: "center",
  },

  goodsRibbonList:{
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    alignSelf: 'center',
    gap: 16,
  },
  goodsRibbon:{
    alignItems: 'center',
    position: 'relative',
    width: 82,
    height: 104,
    flexShrink: 0,
  },
  circularImageContainer: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  circularImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 18,
    height: 40,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 10,
  },
  ribbonImage: {
    width: '100%',
    height: '100%',
  },
  ribbonText: {
    position: 'absolute',
    color: 'white',
    fontSize: 10,
    top: 5,
    zIndex: 11,
  },

  head2: {
    fontSize: 20,
    fontWeight: "black",
  },
  caption1: {
    fontSize: 14,
    color: "black",
    fontWeight: "600",
  },
  caption2: {
    fontSize: 12,
    color: "black",
    fontWeight: "600",
  },
});