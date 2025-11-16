// app/(tabs)/home.tsx
import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// --- 상수 및 목 데이터 (infoMain.tsx에서 가져옴) ---
// Note: 실제로는 API 응답(responseData)에 따라 이 데이터가 업데이트되어야 합니다.
const events = ["가나디's 쿠킹클래스", "크리스마스 행사", "신년 행사", "겨울 마켓"];

const goodsData = [
  { id: 1, name: "가나디 키링", price: "₩ 5,000", image: require("../../assets/images/goods1.png"), numimage: require("../../assets/images/number1.png") },
  { id: 2, name: "가나디 그립톡", price: "₩ 5,000", image: require("../../assets/images/goods2.png"), numimage: require("../../assets/images/number2.png") },
];

const perksData = [
  { id: 1, name: "가나디 키링", people: "선착순 100명", image: require("../../assets/images/goods1.png"), numimage: require("../../assets/images/number1.png") },
  { id: 2, name: "가나디 그립톡", people: "선착순 50명", image: require("../../assets/images/goods2.png"), numimage: require("../../assets/images/number2.png") },
];

// 🔧 API URL: EnterInfo.tsx에서 가져옴
const API_URL = "http://192.168.0.29:4000/analyze"; 

// --- 메인 컴포넌트 ---
const Home = () => {
  const router = useRouter();
  
  // 💡 상태 관리: Home 탭의 현재 뷰를 결정합니다.
  const [viewMode, setViewMode] = useState<'default' | 'input' | 'detail'>('default'); // 'default', 'input', 'detail'
  
  // 상태 관리: Event Selection (mainPage.tsx & infoMain.tsx)
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(events[0]);
  const [activeTab, setActiveTab] = useState("행사예매/입장");
  
  // 상태 관리: API Input (enterInfo.tsx)
  const [blogLink, setBlogLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState<any>(null); // 실제 API 응답 데이터

  // --- API 호출 함수 (enterInfo.tsx 로직) ---
  const handleSubmit = useCallback(async () => {
    if (!blogLink.trim()) {
      Alert.alert("알림", "웹페이지 링크를 입력해주세요.");
      return;
    }
    if (!blogLink.includes('http://') && !blogLink.includes('https://')) {
      Alert.alert("알림", "올바른 URL을 입력해주세요. (http:// 또는 https://로 시작)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: blogLink.trim() }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`서버 응답 오류: ${response.status} - ${errorText.substring(0, 50)}...`);
      }

      const data = await response.json();

      if (data.success) {
        setResponseData(data);
        Alert.alert("성공", "행사 정보를 받았습니다!");
        
        // 💡 성공 시 상세 화면으로 전환
        setViewMode('detail'); 
      } else {
        throw new Error(data.error || "분석 실패");
      }
    } catch (error: any) {
      console.error("❌ 오류 발생:", error);
      Alert.alert("오류", error.message || "행사 정보 분석 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [blogLink]);

  // --- 뷰 렌더링 함수 ---

  // 1. 정보 입력 폼 뷰 (enterInfo.tsx)
  const renderInputForm = useMemo(() => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={[styles.content, {paddingTop: 56, paddingBottom: 100}]}>
        <Image 
          source={require("../../assets/images/logo.png")} 
          style={styles.logo} 
          resizeMode="contain"
        />

        <View style={styles.textSection}>
          <Text style={styles.mainTitleEnter}>
            행사 관련 공식 게시물의{'\n'}링크를 올려주세요
          </Text>
          <Text style={styles.subTitleEnter}>
            행사에 대한 링크를 올리면 AI가 자동 정리해줘요
          </Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>행사 관련 공지 링크</Text>
          <TextInput
            style={styles.input}
            placeholder="https://blog.naver.com/..."
            placeholderTextColor="#CECECE"
            value={blogLink}
            onChangeText={setBlogLink}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          
          <View style={styles.warningBox}>
            <View style={styles.warningIcon}>
              <Ionicons name="information-circle-outline" size={14} color="#616161" />
            </View>
            <Text style={styles.warningText}>
              네이버 블로그, 티스토리 등 다양한 사이트를 지원해요
            </Text>
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>행사 관련 공지 이미지</Text>
          <View style={styles.imageUploadBoxDisabled}>
            <Ionicons name="image-outline" size={16} color="#CECECE" />
            <Text style={styles.uploadText}>사진을 업로드해주세요. (준비중)</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>분석 중...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>정보 등록하기</Text>
          )}
        </TouchableOpacity>

        {/* 💡 임시로 디테일 뷰로 전환하는 버튼 추가 (개발용) */}
        <TouchableOpacity 
          style={[styles.submitButton, {backgroundColor: '#616161', marginTop: 10}]} 
          onPress={() => setViewMode('detail')}
        >
          <Text style={styles.submitButtonText}>임시: 상세 화면 이동</Text>
        </TouchableOpacity>

        {/* API 디버그 정보 */}
        {responseData && (
          <View style={styles.jsonContainer}>
            <Text style={styles.jsonTitle}>📊 분석된 행사 정보:</Text>
            <ScrollView style={styles.jsonScrollView} nestedScrollEnabled={true}>
              <Text style={styles.jsonText}>
                {JSON.stringify(responseData.event, null, 2)}
              </Text>
            </ScrollView>
          </View>
        )}
      </View>
    </ScrollView>
  ), [blogLink, loading, responseData, handleSubmit]);

  // 2. 상세 정보 뷰 (infoMain.tsx)
  const renderDetailView = useMemo(() => (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      {/* 상단 이미지 + 그라데이션 */}
      <View style={styles.imageBackgroundContainer}>
        {/* 💡 이미지 경로 수정 */}
        <Image
          source={require("../../assets/images/ganadi.png")}
          style={styles.eventImage}
          resizeMode="cover"
        />
        <Image
          source={require("../../assets/images/black.png")}
          style={styles.eventImageCover}
          resizeMode="cover"
        />
        {/* 로고 */}
        <Image 
          source={require("../../assets/images/logoWhite.png")} 
          style={styles.logoWhite} 
          resizeMode="contain"
        />

        {/* 드롭다운 (infoMain 버전) */}
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity style={styles.dropdownInfo} onPress={() => setDropdownOpen(!dropdownOpen)}>
            <Text style={styles.dropdownTextInfo}>{selectedEvent}</Text>
            {/* 💡 이미지 경로 수정 */}
            <Image
              source={require("../../assets/images/arrowdown.png")}
              style={styles.iconArrowBottom242}
            />
          </TouchableOpacity>
          {dropdownOpen && (
            <View style={styles.dropdownListInfo}>
              {events.filter(e => e !== selectedEvent).map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.dropdownItemInfo}
                  onPress={() => {
                    setSelectedEvent(item);
                    setDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownItemTextInfo}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 상단 텍스트 오버레이 */}
        <View style={styles.overlayContent}>
          <Text style={styles.mainTitleInfo}>가나디's 쿠킹클래스</Text>
          <Text style={styles.ddayText}>
            <Text style={styles.preRegistration}>사전예약</Text>
            <Text style={styles.ddayValue}> D-1 (2025/11/24)</Text>
          </Text>
          <View style={styles.ul}>
            <Text style={styles.li}>주소: 일산 킨텍스 제2전시장 9, 10홀 및 외부 행사장</Text>
            <Text style={styles.li}>일시: 2025.11.20(목) ~ 2025.11.24(일) (4일간)</Text>
            <Text style={styles.li}>운영시간: (월)10:00~18:00/(화) 11:00~15:00</Text>
          </View>
        </View>
      </View>

      {/* 콘텐츠 영역 */}
      <View style={styles.contentArea}>
        {/* 탭 */}
        <View style={styles.tabContainer}>
            {["행사예매/입장", "특전/굿즈", "과거행사기록"].map((tab, index) => (
            <TouchableOpacity
                key={tab}
                style={{ paddingBottom: 8, marginRight: index < 2 ? 16 : 0 }}
                onPress={() => setActiveTab(tab)}
            >
                <Text style={tab === activeTab ? styles.tabActive : styles.tabInactive}>
                {tab}
                </Text>
            </TouchableOpacity>
            ))}
        </View>
        {/* 조건부 콘텐츠 */}
        {activeTab === "행사예매/입장" && (
        <View>
            <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>예매정보</Text>
            <Text style={styles.sectionDescription}>행사 예매 및 참석과 관련된 정보에요.</Text>
            <View style={styles.tabContentSeparator} />
            <View style={styles.ul}>
                <Text style={styles.detailItem}>예매 오픈일: YYYY-MM-DD HH:MM</Text>
                <Text style={styles.detailItem}>예매 방식: ~에서 ~형태로 진행</Text>
                <Text style={styles.detailItem}>예매 시 주의사항: ~해야합니다. ~해야합니다.</Text>
            </View>
            </View>

            <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>입장안내</Text>
            <Text style={styles.sectionDescription}>행사 입장 시 알아야 하는 정보들을 모아봤어요.</Text>
            <View style={styles.tabContentSeparator} />
            <View style={styles.ul}>
                <Text style={styles.detailItem}>입장시간: </Text>
                <Text style={styles.detailItem}>입장방식: </Text>
                <Text style={styles.detailItem}>입장 준비물: 신분증 / 여권, UID 등</Text>
            </View>
            </View>
        </View>
        )}

        {activeTab === "특전/굿즈" && (
            <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>행사 특전</Text>
            <Text style={styles.subtitle}>행사에 참여했을 때 기본으로 제공되는 특전 정보에요.</Text>
            
            {perksData.map((item) => (
            <View key={item.id} style={styles.goodsItem}>
                {/* 번호 이미지 */}
                {/* 💡 이미지 경로 수정 */}
                <Image
                source={item.numimage}
                style={styles.numberImage}
                />
                {/* 굿즈 이미지 */}
                {/* 💡 이미지 경로 수정 */}
                <Image source={item.image} style={styles.goodsImage} />
                {/* 텍스트 정보 */}
                <View>
                <Text style={styles.perkName}>{item.people}</Text>
                <Text style={styles.perkDetail}>{item.name}</Text>
                </View>
            </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>굿즈 정보</Text>
            <Text style={styles.subtitle}>행사에서 판매하는 굿즈입니다.</Text>
            {goodsData.map((item) => (
                <View key={item.id} style={styles.goodsItem}>
                {/* 번호 이미지 */}
                {/* 💡 이미지 경로 수정 */}
                <Image
                source={item.numimage}
                style={styles.numberImage}
                />
                {/* 💡 이미지 경로 수정 */}
                <Image source={item.image} style={styles.goodsImage} />
                <View>
                    <Text style={styles.goodsName}>{item.name}</Text>
                    <Text style={styles.goodsPrice}>{item.price}</Text>
                </View>
                </View>
            ))}

            <TouchableOpacity style={styles.cartButton}>
                <Text style={styles.cartText}>해당 굿즈를 담았어요. 보러가기</Text>
            </TouchableOpacity>
            </>
        )}


        {activeTab === "과거행사기록" && (
            <View>
            <Text style={styles.sectionTitle}>과거행사기록</Text>
            <Text style={styles.sectionDescription}>지난 행사들의 정보를 확인할 수 있어요.</Text>
            <View style={styles.tabContentSeparator} />
            <View style={styles.ul}>
                <Text style={styles.detailItem}>2025년 10월 행사: 내용</Text>
                <Text style={styles.detailItem}>2025년 9월 행사: 내용</Text>
            </View>
            </View>
        )}
      </View>
      
      {/* 💡 임시로 디폴트 뷰로 전환하는 버튼 추가 (개발용) */}
      <TouchableOpacity 
        style={[styles.submitButton, {backgroundColor: '#E0E0E0', marginHorizontal: 16, marginBottom: 20}]} 
        onPress={() => setViewMode('default')}
      >
        <Text style={[styles.submitButtonText, {color: '#333'}]}>임시: 디폴트 화면 이동</Text>
      </TouchableOpacity>
      
    </ScrollView>
  ), [dropdownOpen, selectedEvent, activeTab]);


  // 3. 디폴트/빈 화면 뷰 (mainPage.tsx)
  const renderDefaultView = useMemo(() => (
    <View style={styles.containerDefault}>
      {/* 로고 */}
      <Image 
        source={require("../../assets/images/logo.png")} 
        style={styles.logo} 
        resizeMode="contain"
      />

      {/* 드롭다운 (mainPage 버전) */}
      <View style={{ position: 'relative', marginHorizontal: 16 }}> 
        <TouchableOpacity 
          style={styles.dropdownDefault}
          onPress={() => setDropdownOpen(!dropdownOpen)}
        >
          <Text style={styles.dropdownTextDefault}>
            {selectedEvent || "행사를 선택해주세요."}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#616161" />
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={[styles.dropdownListDefault, { position: 'absolute', top: 44, left: 0, right: 0, zIndex: 10 }]}>
            {events.map((item: string, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.dropdownItemDefault}
                onPress={() => {
                  setSelectedEvent(item);
                  setDropdownOpen(false);
                  // 💡 선택 시 상세 뷰로 전환 (실제 데이터 선택 로직 필요)
                  setViewMode('detail'); 
                }}
              >
                <Text style={styles.dropdownItemTextDefault}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* 메인 콘텐츠 */}
      <View style={styles.mainContentDefault}>
        <Text style={styles.mainTitleDefault}>행사 정보가 존재하지 않아요.</Text>
        <Text style={styles.mainSubtitleDefault}>첫 정보를 입력해볼까요?</Text>
        
        <TouchableOpacity
          style={styles.addButtonDefault}
          // 💡 enterInfo 대신 'input' 뷰 모드로 전환
          onPress={() => setViewMode('input')}
        >
          <Text style={styles.addButtonText}>행사 추가하기</Text>
        </TouchableOpacity>
      </View>
      
    </View>
  ), [dropdownOpen, selectedEvent]);
  

  // --- 메인 렌더링 ---
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 💡 Stack.Screen 정의는 (tabs)/_layout.tsx로 이동 */}
      
      {viewMode === 'default' && renderDefaultView}
      {viewMode === 'input' && renderInputForm}
      {viewMode === 'detail' && renderDetailView}
      
    </SafeAreaView>
  );
};

// --- 스타일 시트 (세 파일 통합) ---
const styles = StyleSheet.create({
  // -------------------- 공통 스타일 --------------------
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  logo: { 
    width: 123, 
    height: 22,
    marginBottom: 28,
    marginHorizontal: 16,
    marginTop: 56,
  },
  
  // -------------------- 1. EnterInfo (Input Form) 스타일 --------------------
  scrollView: {
    flex: 1,
  },
  content: { 
    paddingHorizontal: 16, 
    gap: 20,
  },
  textSection: {
    gap: 8,
  },
  mainTitleEnter: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    lineHeight: 28,
  },
  subTitleEnter: {
    fontSize: 16,
    color: "#000",
    lineHeight: 22,
  },
  inputSection: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  input: {
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 24,
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningIcon: {
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  warningText: {
    fontSize: 12,
    color: "#494949",
  },
  imageUploadBoxDisabled: {
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  uploadText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#CECECE",
  },
  submitButton: {
    backgroundColor: "#FF59AD",
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  jsonContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  jsonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  jsonScrollView: {
    maxHeight: 400,
  },
  jsonText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#333",
    lineHeight: 18,
  },

  // -------------------- 2. InfoMain (Detail View) 스타일 --------------------
  imageBackgroundContainer: { 
    height: 480, 
    width: '100%', 
    overflow: 'hidden' 
  },
  eventImage: {
    width: 219,
    height: 274,
    position: 'absolute',
    top: 162,
    left: '50%',
    marginLeft: -109,
  },
  eventImageCover: { 
    width: '100%', // 360px 대신 '100%' 사용
    height: 480, 
    position: 'absolute' 
  },
  logoWhite: { 
    width: 123, 
    height: 22, 
    marginBottom: 28, 
    marginTop: 56, 
    marginLeft: 16, 
    zIndex: 10 
  },
  overlayContent: { 
    position: 'absolute', 
    top: 150, 
    left: 16, 
    right: 16, 
    zIndex: 2 
  },
  mainTitleInfo: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#fff', 
    marginBottom: 8, 
    marginTop:119 
  },
  ddayText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#fff', 
    marginBottom: 24 
  },
  preRegistration: { 
    color: '#fff', 
    fontSize: 14 
  },
  ddayValue: { 
    color: '#FF59AD', 
    fontSize: 20, 
    fontWeight: '700' 
  },
  ul: { 
    marginVertical: 8, 
    paddingLeft: 0
  },
  li: { 
    marginBottom: 4, 
    fontSize: 12, 
    color: '#fff', 
    lineHeight: 20 
  },
  dropdownWrapper: { 
    position: 'absolute', 
    top: 106, 
    left: 16, 
    width: 328, 
    zIndex: 3 
  },
  dropdownInfo: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'rgba(239,239,239,0.5)', 
    height: 44, 
    borderRadius: 10, 
    paddingHorizontal: 16 
  },
  dropdownTextInfo: { 
    fontSize: 13, 
    color: '#333', 
    fontWeight: '600' 
  },
  dropdownListInfo: { 
    position: 'absolute', 
    top: 50, 
    left: 0, 
    right: 0, 
    backgroundColor: '#fff', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#ddd' 
  },
  dropdownItemInfo: { 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  dropdownItemTextInfo: { 
    fontSize: 13, 
    color: '#333' 
  },
  iconArrowBottom242: { 
    width: 20, 
    height: 20, 
    tintColor: '#616161' 
  },
  contentArea: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    paddingHorizontal: 16, 
    paddingTop: 33, 
    paddingBottom: 80, 
    marginTop: -12,
    zIndex: 1,
    overflow: 'hidden',
  },
  tabContainer: { 
    flexDirection: 'row', 
    justifyContent: 'flex-start' 
  },
  tabActive: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#FF59AD', 
    borderBottomWidth: 2, 
    borderColor: '#FF59AD', 
    paddingBottom: 8 
  },
  tabInactive: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#9E9E9E', 
    paddingBottom: 8 
  },
  infoSection: { 
    marginBottom: 20, 
    marginTop: 0 
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#000', 
    marginBottom: 4, 
    marginTop:36
  },
  sectionDescription: { 
    fontSize: 12, 
    color: '#9E9E9E', 
    marginBottom: 20 
  },
  detailItem: { 
    marginBottom: 4, 
    fontSize: 13, 
    color: '#333', 
    lineHeight: 18 
  },
  tabContentSeparator: { 
    height: 1, 
    backgroundColor: '#E0E0E0', 
    marginBottom:12 
  },
  subtitle: { 
    fontSize: 12, 
    color: "#9E9E9E", 
    marginBottom: 12 
  },
  perkName: { 
    fontWeight: "600" 
  },
  perkDetail: { 
    color: "#616161" 
  },
  goodsItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12, 
    marginBottom: 12 
  },
  goodsImage: { 
    width: 64, 
    height: 64, 
    borderRadius: 10 
  },
  goodsName: { 
    fontSize: 14, 
    fontWeight: "600" 
  },
  goodsPrice: { 
    fontSize: 12, 
    color: "#616161" 
  },
  cartButton: { 
    marginTop: 16, 
    padding: 12, 
    backgroundColor: "#efefef", 
    borderRadius: 10, 
    alignItems: "center" 
  },
  cartText: { 
    fontWeight: "600", 
    color: "#FF59AD" 
  },
  numberImage: { 
    width: 18, 
    height: 18, 
    marginRight: 8 
  },

  // -------------------- 3. MainPage (Default View) 스타일 --------------------
  containerDefault: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  dropdownDefault: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EFEFEF",
    // width: 328, // '100%'로 변경하여 유연하게
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  dropdownTextDefault: { 
    fontSize: 12, 
    color: "#616161", 
    fontWeight: "600" 
  },
  dropdownListDefault: { 
    backgroundColor: "#fff", 
    marginTop: 4, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: "#ddd" 
  },
  dropdownItemDefault: { 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee" 
  },
  dropdownItemTextDefault: { 
    fontSize: 12, 
    color: "#333" 
  },
  mainContentDefault: { 
    marginTop: 200,
    marginHorizontal: 16, 
  },
  mainTitleDefault: { 
    fontSize: 20, 
    fontWeight: "600", 
    color: "#000", 
    marginBottom: 4, 
  },
  mainSubtitleDefault: { 
    fontSize: 16, 
    color: "#000", 
    marginBottom: 16, 
  },
  addButtonDefault: { 
    backgroundColor: "#FF59AD", 
    width: 114, 
    height: 38, 
    borderRadius: 10, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  addButtonText: { 
    color: "#fff", 
    fontSize: 12, 
    fontWeight: "700" 
  },
});

export default Home;