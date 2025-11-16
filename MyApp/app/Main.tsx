import * as React from "react";
import { Image, StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
const events = ["가나디's 쿠킹클래스", "크리스마스 행사", "신년 행사", "겨울 마켓"];
const Main = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
    const [selectedEvent, setSelectedEvent] = React.useState(events[0]);

    
  
  // 전달받은 데이터 파싱
  const [eventData, setEventData] = React.useState<any>(null);
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("행사예매/입장");

  React.useEffect(() => {
    if (params.eventData) {
      try {
        const parsed = JSON.parse(params.eventData as string);
        
        // 서버에서 전달된 데이터는 이벤트 정보, 굿즈 정보, 이미지 배열이 모두 포함된 최종 병합된 객체라고 가정합니다.
        setEventData(parsed); 
        console.log("📊 받은 데이터:", parsed);
      } catch (e) {
        console.error("데이터 파싱 오류:", e);
      }
    }
  }, [params]);

  // 기본 더미 데이터 (데이터가 없을 때)
  const defaultData = {
    event_title: "가나디's 쿠킹클래스",
    official_link: "",
    event_overview: {
      address: "일산 킨텍스 제2전시장 9, 10홀 및 외부 행사장",
      date_range: "2025.11.20(목) ~ 2025.11.24(일)",
      duration_days: 4,
      daily_hours: "(월)10:00~18:00/(화) 11:00~15:00"
    },
    reservation_info: {
      open_date: "YYYY-MM-DD HH:MM",
      method: "~에서 ~형태로 진행",
      notes: "~해야합니다. ~해야합니다."
    },
    entrance_info: {
      entry_time: "입장 시간 정보",
      entry_method: "입장 방식 정보",
      entry_items: ["신분증", "여권", "UID 등"]
    },
    event_contents: [],
    event_benefits: [],
    goods_list: [],
    uploaded_images: [] // **수정: 기본 데이터에 이미지 배열 추가**
  };

  const data = eventData || defaultData;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* 상단 이미지 + 그라데이션 */}
        <View style={styles.imageBackgroundContainer}>
          <Image
            source={require("../assets/images/ganadi.png")}
            style={styles.eventImage}
            resizeMode="cover"
          />
          <Image
            source={require("../assets/images/black.png")}
            style={styles.eventImageCover}
            resizeMode="cover"
          />
          {/* 로고 */}
          <Image 
            source={require("../assets/images/logoWhite.png")} 
            style={styles.logo} 
            resizeMode="contain"
          />

          {/* 드롭다운 - 일단 비활성화 */}

          <View style={styles.dropdownWrapper}>
            <TouchableOpacity 
                style={styles.dropdown} 
                onPress={() => setOpen(!open)}
                activeOpacity={0.8}
            >
                <Text style={styles.dropdownText}>{data.event_title}</Text>
                <Image
                source={require("../assets/images/arrowdown.png")}
                style={[
                    styles.iconArrowBottom242,
                    open && { transform: [{ rotate: '180deg' }] } // 열리면 화살표 뒤집기
                ]}
                />
            </TouchableOpacity>

            {open && (
                <View style={styles.dropdownList}>
                {events.filter(e => e !== selectedEvent).map((item, idx) => (
                    <TouchableOpacity
                    key={idx}
                    style={styles.dropdownItem}
                    onPress={() => {
                        setSelectedEvent(item);
                        setOpen(false);
                    }}
                    activeOpacity={0.7}
                    >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                    </TouchableOpacity>
                ))}
                </View>
            )}
            </View>


          {/* 상단 텍스트 오버레이 */}
          <View style={styles.overlayContent}>
            <Text style={styles.mainTitle}>{data.event_title}</Text>
            <Text style={styles.ddayText}>
              <Text style={styles.preRegistration}>사전예약</Text>
              <Text style={styles.ddayValue}> D-? ({data.reservation_info?.open_date || "날짜 미정"})</Text>
            </Text>
            <View style={styles.ul}>
              <Text style={styles.li}>주소: {data.event_overview?.address || "정보 없음"}</Text>
              <Text style={styles.li}>
                일시: {data.event_overview?.date_range || "정보 없음"} 
                {data.event_overview?.duration_days ? ` (${data.event_overview.duration_days}일간)` : ""}
              </Text>
              <Text style={styles.li}>운영시간: {data.event_overview?.daily_hours || "정보 없음"}</Text>
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
              {/* 예매정보 */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>예매정보</Text>
                <Text style={styles.sectionDescription}>행사 예매 및 참석과 관련된 정보에요.</Text>
                <View style={styles.tabContentSeparator} />
                <View style={styles.ul}>
                  <Text style={styles.detailItem}>
                    예매 오픈일: {data.reservation_info?.open_date || "정보 없음"}
                  </Text>
                  <Text style={styles.detailItem}>
                    예매 방식: {data.reservation_info?.method || "정보 없음"}
                  </Text>
                  <Text style={styles.detailItem}>
                    예매 시 주의사항: {data.reservation_info?.notes || "정보 없음"}
                  </Text>
                </View>
              </View>

              {/* 입장 안내 */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>입장안내</Text>
                <Text style={styles.sectionDescription}>행사 입장 시 알아야 하는 정보들을 모아봤어요.</Text>
                <View style={styles.tabContentSeparator} />
                <View style={styles.ul}>
                  <Text style={styles.detailItem}>
                    입장시간: {data.entrance_info?.entry_time || "정보 없음"}
                  </Text>
                  <Text style={styles.detailItem}>
                    입장방식: {data.entrance_info?.entry_method || "정보 없음"}
                  </Text>
                  <Text style={styles.detailItem}>
                    입장 준비물: {data.entrance_info?.entry_items?.join(", ") || "정보 없음"}
                  </Text>
                </View>
              </View>

              
            </View>
          )}

          {activeTab === "특전/굿즈" && (
            <>
            {/* 행사 콘텐츠 */}
              {data.event_contents && data.event_contents.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>행사 콘텐츠</Text>
                  <Text style={styles.sectionDescription}>행사에서 진행되는 프로그램이에요.</Text>
                  <View style={styles.tabContentSeparator} />
                  {data.event_contents.map((content: any, idx: number) => (
                    <View key={idx} style={styles.contentItem}>
                      <Text style={styles.contentTitle}>• {content.title}</Text>
                      <Text style={styles.contentDescription}>{content.description}</Text>
                    </View>
                  ))}
                </View>
              )}
              {/* 행사 특전 */}
              
              {data.event_benefits && data.event_benefits.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>행사 특전</Text>
                  <Text style={styles.sectionDescription}>행사에 참여했을 때 기본으로 제공되는 특전 정보에요.</Text>
                  <View style={styles.tabContentSeparator} />
                


                  {data.event_benefits.map((benefit: string, idx: number) => (
                    <View key={idx} style={styles.benefitItem}>
                      <View style={styles.benefitNumber}>
                        <Text style={styles.benefitNumberText}>{idx + 1}</Text>
                      </View>
                      <Image source={require("../assets/images/goods1.png")} style={styles.goodsImage}/>
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 굿즈 정보 */}
              {/* 굿즈 목록이나 이미지가 있을 경우 섹션을 표시하도록 조건 수정 */}
              {((data.goods_list && data.goods_list.length > 0) || 
               (data.uploaded_images && data.uploaded_images.length > 0)) && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>굿즈 정보</Text>
                  <Text style={styles.sectionDescription}>행사에서 판매하는 굿즈입니다.</Text>
                  <View style={styles.tabContentSeparator} />

                  
                  
                  {/* **수정: 업로드된 이미지 표시 시작** */}
                  {data.uploaded_images && data.uploaded_images.length > 0 && (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.uploadedImagesContainer} // 이미지 컨테이너 스타일 추가
                    >
                      {data.uploaded_images.map((imgBase64: string, idx: number) => (
                        <Image
                          key={idx}
                          source={{ uri: imgBase64 }}
                          style={styles.uploadedImage}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  )}
                  {/* **수정: 업로드된 이미지 표시 끝** */}

                  {data.goods_list && data.goods_list.length > 0 ? (
                    data.goods_list.map((goods: any, idx: number) => (
                      <View key={idx} style={styles.goodsItem}>
                        <View style={styles.goodsNumber}>
                          <Text style={styles.goodsNumberText}>{idx + 1}</Text>
                        </View>
                        <Image source={require("../assets/images/goods1.png")} style={styles.goodsImage} />
                        <View style={styles.goodsInfo}>
                          <Text style={styles.goodsName}>{goods.goods_name}</Text>
                          <Text style={styles.goodsPrice}>{goods.price}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    // 굿즈 목록이 없지만 이미지가 있다면 이미지를 참고하도록 안내
                    data.uploaded_images && data.uploaded_images.length > 0 ? (
                      <Text style={styles.emptyText}>AI가 굿즈 목록을 추출하지 못했습니다. 이미지를 참고해주세요.</Text>
                    ) : (
                      <Text style={styles.emptyText}>굿즈 정보가 없습니다.</Text>
                    )
                  )}
                </View>
              )}

              {/* 특전/굿즈가 없을 때 안내 (이미지 포함 모든 항목 체크) */}
              {(!data.event_benefits || data.event_benefits.length === 0) && 
               (!data.goods_list || data.goods_list.length === 0) &&
               (!data.uploaded_images || data.uploaded_images.length === 0) && ( // **수정: 이미지도 체크**
                <View style={styles.emptyState}>
                  <Ionicons name="gift-outline" size={48} color="#E0E0E0" />
                  <Text style={styles.emptyText}>특전/굿즈 정보가 없습니다</Text>
                  <Text style={styles.emptySubText}>이미지를 업로드하면 AI가 자동으로 분석해요</Text>
                </View>
              )}
            </>
          )}

          {activeTab === "과거행사기록" && (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color="#E0E0E0" />
              <Text style={styles.emptyText}>과거 행사 기록이 없습니다</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 하단 네비게이션 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push("/mainPage")}
        >
          <Ionicons name="home" size={24} color="#FF59AD" />
          <Text style={styles.navTextActive}>HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color="#616161" />
          <Text style={styles.navTextInactive}>MYPAGE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },

  imageBackgroundContainer: { height: 480, width: '100%', overflow: 'hidden' },
  eventImage: {
    width: 219,
    height: 274,
    position: 'absolute',
    top: 162,
    left: '50%',
    marginLeft: -109,
  },
  eventImageCover: { width: 360, height: 480, position: 'absolute' },

  logo: { width: 123, height: 22, marginBottom: 28, marginTop: 56, marginLeft: 16, zIndex: 10 },

  overlayContent: { position: 'absolute', top: 150, left: 16, right: 16, zIndex: 2 },
  mainTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8, marginTop:119 },
  ddayText: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 24 },
  preRegistration: { color: '#fff', fontSize: 14 },
  ddayValue: { color: '#FF59AD', fontSize: 20, fontWeight: '700' },
  ul: { marginVertical: 8, paddingLeft: 0},
  li: { marginBottom: 4, fontSize: 12, color: '#fff', lineHeight: 20 },

dropdownWrapper: {
  position: 'absolute',
  top: 100,
  left: 16,
  width: 328,
  zIndex: 10, // 드롭다운 위로 올라오게
},

dropdown: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(239, 239, 239, 0.50)',
  height: 48,
  borderRadius: 12,
  paddingHorizontal: 16,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3, // 안드로이드 그림자
},

dropdownText: {
  fontSize: 12,
  color: '#616161',
  fontWeight: '600',
},

dropdownList: {
  position: 'absolute',
  top: 52,
  left: 0,
  right: 0,
  backgroundColor: '#FFF',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E0E0E0',
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
  maxHeight: 200, // 최대 높이
  overflow: 'hidden',
},

dropdownItem: {
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#F0F0F0',
},

dropdownItemText: {
  fontSize: 14,
  color: '#444',
},

iconArrowBottom242: {
  width: 20,
  height: 20,
  tintColor: '#616161',
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

  tabContainer: { flexDirection: 'row', justifyContent: 'flex-start' },
  tabActive: { fontSize: 14, fontWeight: '700', color: '#FF59AD', borderBottomWidth: 2, borderColor: '#FF59AD', paddingBottom: 8 },
  tabInactive: { fontSize: 14, fontWeight: '500', color: '#9E9E9E', paddingBottom: 8 },

  infoSection: { marginBottom: 20, marginTop: 0 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 4, marginTop:36},
  sectionDescription: { fontSize: 12, color: '#9E9E9E', marginBottom: 0},
  detailItem: { marginBottom: 8, fontSize: 13, color: '#333', lineHeight: 18 },
  tabContentSeparator: { height: 1, backgroundColor: '#E0E0E0', marginBottom:20, marginTop: 20},

  contentItem: { marginBottom: 16 },
  contentTitle: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 4 },
  contentDescription: { fontSize: 13, color: '#616161', lineHeight: 18 },

  benefitItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    marginBottom: 12,
   

 
  },
  benefitNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  benefitNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  benefitText: { 
    flex: 1,
    fontSize: 14, 
    color: '#333',
    fontWeight: '500',
    lineHeight: 20,
  },

goodsItem: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  goodsNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  goodsNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  goodsInfo: {
    flex: 1,
  },
goodsName: { fontSize: 14, fontWeight: "600" },
goodsPrice: { fontSize: 12, color: "#616161" ,marginTop:4 },
goodsImage: { width: 64, height: 64, borderRadius: 10 },
  // **추가된 스타일**
  uploadedImagesContainer: {
    paddingVertical: 10,
    gap: 10, // 이미지 간격
  },
  uploadedImage: { 
    width: 80, // 크기를 80x80으로 조정
    height: 80, 
    borderRadius: 8, // 모서리 둥글게
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  // **추가된 스타일 끝**

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#9E9E9E',
    fontWeight: '600',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 12,
    color: '#CECECE',
  },

  bottomNav: { 
    flexDirection: 'row', 
    backgroundColor: '#000', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    paddingVertical: 15, 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 70 
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navTextActive: { color: '#FF59AD', fontSize: 8, fontWeight: '600', marginTop: 2 },
  navTextInactive: { color: '#616161', fontSize: 8, fontWeight: '600', marginTop: 2 },

  subtitle: { fontSize: 12, color: "#9E9E9E", marginBottom: 12 },
});

export default Main;