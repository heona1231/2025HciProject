import * as React from "react";
import { Text, StyleSheet, View, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useRouter } from "expo-router"; // <-- 라우터 import

const Maindefault: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState("");
  const router = useRouter(); // <-- 라우터 훅

  // 드롭다운 항목 리스트
  const events = ["크리스마스 행사", "신년 행사", "겨울 마켓"];

  return (
    
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{ headerShown: false }} // ← 이게 핵심
      />
      <View style={styles.content}>
        {/* 로고 */}
        <Image 
          source={require("../assets/images/logo.png")} 
          style={styles.logo} 
          resizeMode="contain"
        />

        {/* 드롭다운 */}
        <View>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setOpen(!open)}
          >
            <Text style={styles.dropdownText}>
              {selectedEvent || "행사를 선택해주세요."}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#616161" />
          </TouchableOpacity>

          {open && (
            <View style={styles.dropdownList}>
              {events.map((item, index) => (
                <TouchableOpacity
                  key={index}
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

        {/* 메인 콘텐츠 */}
        <View style={styles.mainContent}>
          <Text style={styles.mainTitle}>행사 정보가 존재하지 않아요.</Text>
          <Text style={styles.mainSubtitle}>첫 정보를 입력해볼까요?</Text>
          
          {/* ← 여기서 router.push("/enterInfo") 추가 */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/enterInfo")}
          >
            <Text style={styles.addButtonText}>행사 추가하기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 네비게이션 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
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
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 56 },
  logo: { width: 123, height: 22, marginBottom: 28 },

  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EFEFEF",
    width: 328,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 16,
  },

  dropdownText: { fontSize: 12, color: "#616161", fontWeight: "600" },

  dropdownList: { backgroundColor: "#fff", marginTop: 4, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  dropdownItemText: { fontSize: 12, color: "#333" },

  mainContent: { marginTop: 200 },
  mainTitle: { fontSize: 20, fontWeight: "600", color: "#000", marginBottom: 4 , marginLeft: 16 },
  mainSubtitle: { fontSize: 16, color: "#000", marginBottom: 16, marginLeft: 16 },
  addButton: { backgroundColor: "#FF59AD", width: 114, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", marginLeft:16 },
  addButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#000",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 20,
    height: 74,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  navTextActive: { color: "#FF59AD", fontSize: 8, fontWeight: "600", marginTop: 2 },
  navTextInactive: { color: "#616161", fontSize: 8, fontWeight: "600", marginTop: 2 },
});

export default Maindefault;
