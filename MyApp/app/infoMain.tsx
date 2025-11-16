import * as React from "react";
import { Image, StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
const events = ["가나디's 쿠킹클래스", "크리스마스 행사", "신년 행사", "겨울 마켓"];

const Main = () => {
  const [open, setOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState(events[0]);
  const router = useRouter();

  return (
    
    <SafeAreaView style={styles.safeArea}>
        <Stack.Screen
            options={{ headerShown: false }} // ← 이게 핵심
            />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* 상단 이미지 + 그라데이션 */}
        <View style={styles.imageBackgroundContainer}>
          <Image
            source={require("../assets/images/ganadi.png")}
            style={styles.eventImage}
            resizeMode="cover"
          />
          {/* <LinearGradient
            colors={['rgba(255,255,255,0.3)','rgba(0,0,0,0.3)']}
            style={styles.mainGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          /> */}
            <Image
            source={require("../assets/images/black.png")}
            style={styles.eventImageCover}
            resizeMode="cover"
          />

          {/* 로고 */}
                  <Image 
                    source={require("../assets/images/logo.png")} 
                    style={styles.logo} 
                    resizeMode="contain"
                  />

          {/* 드롭다운 */}
          <View style={styles.dropdownWrapper}>
            <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(!open)}>
              <Text style={styles.dropdownText}>{selectedEvent}</Text>
              <Image
                source={require("../assets/images/arrowdown.png")}
                style={styles.iconArrowBottom242}
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
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* 상단 텍스트 오버레이 */}
          <View style={styles.overlayContent}>
            <Text style={styles.mainTitle}>가나디's 쿠킹클래스</Text>
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
            <Text style={styles.tabActive}>행사예매/입장</Text>
            <Text style={styles.tabInactive}>특전/굿즈</Text>
            <Text style={styles.tabInactive}>과거행사기록</Text>
          </View>
          

          {/* 예매정보 */}
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

          

          {/* 입장 안내 */}
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
    logo: { width: 123, height: 22, marginBottom: 28, marginTop: 56, marginLeft :16},
  safeArea: { flex: 1, backgroundColor: "#fff" },
  imageBackgroundContainer: { height: 480, width: '100%', overflow: 'hidden' },
  mainGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 480 },
  eventImage: {
  width: 219,
  height: 274,
  position: 'absolute',  // 상단 위치 고정
  top: 162,              // 필요 시 위치 조정
  left: '50%',
  marginLeft: -109,      // width / 2로 가운데 정렬
},
eventImageCover:{
    width: 360,
    height: 480,
    position: 'absolute',  // 상단 위치 고정

},

  overlayContent: { position: 'absolute',  top: 150, left: 16, right: 16, zIndex: 2 },
  mainTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8, marginTop:119 },
  ddayText: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 24 },
  preRegistration: { color: '#fff', fontSize: 14 },
  ddayValue: { color: '#FF59AD', fontSize: 20, fontWeight: '700' },
  ul: { marginVertical: 10, paddingLeft: 0 },
  li: { marginBottom: 4, fontSize: 12, color: '#fff', lineHeight: 20 },


  dropdownWrapper: { position: 'absolute', top: 106, left: 16, width: 328, zIndex: 3 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F7F7F7', height: 44, borderRadius: 10, paddingHorizontal: 16 },
  dropdownText: { fontSize: 13, color: '#333', fontWeight: '600' },
  dropdownList: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownItemText: { fontSize: 13, color: '#333' },
  iconArrowBottom242: { width: 20, height: 20, tintColor: '#616161' },

contentArea: { 
  backgroundColor: '#fff', 
  borderTopLeftRadius: 20, 
  borderTopRightRadius: 20, 
  paddingHorizontal: 16, 
  paddingTop: 16, 
  paddingBottom: 80, 
  marginTop: -12, // 이미지 아래로 겹치도록
  minHeight: 466,  // 기존 고정 대신 최소 높이
  zIndex: 1,
  overflow: 'hidden',
},

  tabContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20 },
  tabActive: { fontSize: 14, fontWeight: '700', color: '#000', borderBottomWidth: 2, borderColor: '#000', paddingBottom: 8 },
  tabInactive: { fontSize: 14, fontWeight: '500', color: '#9E9E9E', paddingBottom: 8 },
  tabContentSeparator: { height: 1, backgroundColor: '#E0E0E0', marginBottom: 20 },

  infoSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 4 },
  sectionDescription: { fontSize: 12, color: '#9E9E9E', marginBottom: 15 },
  detailItem: { marginBottom: 4, fontSize: 13, color: '#333', lineHeight: 18 },
  contentSeparator: { height: 8, backgroundColor: '#F7F7F7', marginVertical: 20 },

  bottomNav: { flexDirection: 'row', backgroundColor: '#000', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingVertical: 15, position: 'absolute', bottom: 0, left: 0, right: 0, height: 70 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navTextActive: { color: '#FF59AD', fontSize: 8, fontWeight: '600', marginTop: 2 },
  navTextInactive: { color: '#616161', fontSize: 8, fontWeight: '600', marginTop: 2 },
  homeIcon: { width: 24, height: 24, tintColor: '#FF59AD' },
  mypageIcon: { width: 24, height: 24, tintColor: '#616161' },
});

export default Main;
