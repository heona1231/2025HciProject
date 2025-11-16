import * as React from "react";
import { Text, StyleSheet, View, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useRouter } from "expo-router";

const EnterInfo: React.FC = () => {
  const [blogLink, setBlogLink] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [responseData, setResponseData] = React.useState<any>(null);
  const router = useRouter();

  // 정보 등록 (API 호출)
  const handleSubmit = async () => {
    if (!blogLink.trim()) {
      Alert.alert("알림", "네이버 블로그 링크를 입력해주세요.");
      return;
    }

    if (!blogLink.includes('blog.naver.com')) {
      Alert.alert("알림", "네이버 블로그 링크만 지원합니다.");
      return;
    }

    setLoading(true);

    try {
      console.log("📤 서버로 전송 중...");
      console.log("링크:", blogLink);

      // API 호출 (JSON으로 전송)
      const response = await fetch("http://localhost:4000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          link: blogLink.trim()
        }),
      });

      console.log("📥 응답 상태:", response.status);

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const data = await response.json();
      console.log("📊 서버 응답:", data);

      if (data.success) {
        console.log("✅ 성공!");
        // 서버 응답 데이터 저장
        setResponseData(data);
        
        Alert.alert(
          "성공", 
          "행사 정보를 받았습니다! 아래에서 확인하세요.",
          [
            {
              text: "확인"
            }
          ]
        );
      } else {
        throw new Error(data.error || "분석 실패");
      }
    } catch (error: any) {
      console.error("❌ 오류:", error);
      Alert.alert(
        "오류", 
        error.message || "행사 정보 분석 중 문제가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 로고 */}
          <Image 
            source={require("../assets/images/logo.png")} 
            style={styles.logo} 
            resizeMode="contain"
          />

          {/* 메인 텍스트 */}
          <View style={styles.textSection}>
            <Text style={styles.mainTitle}>
              행사 관련 공식 게시물의{'\n'}링크를 올려주세요
            </Text>
            <Text style={styles.subTitle}>
              행사에 대한 링크와 이미지를 올리면 AI가 자동 정리해줘요
            </Text>
          </View>

          {/* 링크 입력 섹션 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>행사 관련 공지 링크</Text>
            <TextInput
              style={styles.input}
              placeholder="링크를 입력해주세요."
              placeholderTextColor="#CECECE"
              value={blogLink}
              onChangeText={setBlogLink}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            {/* 안내 메시지 */}
            <View style={styles.warningBox}>
              <View style={styles.warningIcon}>
                <Ionicons name="alert-circle-outline" size={12} color="#616161" />
              </View>
              <Text style={styles.warningText}>'X'의 정보는 읽을 수 없어요.</Text>
            </View>
          </View>

          {/* 이미지 업로드 섹션 (비활성화 상태로 표시) */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>행사 관련 공지 이미지</Text>
            
            <View style={styles.imageUploadBoxDisabled}>
              <Ionicons name="image-outline" size={16} color="#CECECE" />
              <Text style={styles.uploadText}>사진을 업로드해주세요.</Text>
            </View>
          </View>

          {/* 등록 버튼 */}
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
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

          {/* JSON 응답 표시 */}
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

      {/* 하단 네비게이션 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push("/")}
          disabled={loading}
        >
          <Ionicons name="home" size={24} color="#FF59AD" />
          <Text style={styles.navTextActive}>HOME</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} disabled={loading}>
          <Ionicons name="person-outline" size={24} color="#616161" />
          <Text style={styles.navTextInactive}>MYPAGE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },

  scrollView: {
    flex: 1,
  },
  
  content: { 
    paddingHorizontal: 16, 
    paddingTop: 56,
    paddingBottom: 100,
    gap: 20,
  },
  
  logo: { 
    width: 123, 
    height: 22,
  },

  textSection: {
    gap: 8,
  },

  mainTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    lineHeight: 28,
  },

  subTitle: {
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
    width: 12,
    height: 12,
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

  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#000",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 20,
    height: 74,
  },

  navItem: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },

  navTextActive: { 
    color: "#FF59AD", 
    fontSize: 8, 
    fontWeight: "600", 
    marginTop: 2 
  },

  navTextInactive: { 
    color: "#616161", 
    fontSize: 8, 
    fontWeight: "600", 
    marginTop: 2 
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
});

export default EnterInfo;