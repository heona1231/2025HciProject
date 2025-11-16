import * as React from "react";
import { Text, StyleSheet, View, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';

const EnterInfo: React.FC = () => {
  const [blogLink, setBlogLink] = React.useState("");
  const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [responseData, setResponseData] = React.useState<any>(null);
  const router = useRouter();

  // 🔧 여기에 실제 컴퓨터의 IP 주소를 입력하세요
  const API_URL = "http://192.168.0.29:4000/analyze";
  const IMAGE_API_URL = "http://192.168.0.29:4000/analyze-image";

  // 이미지 선택
  const pickImages = async () => {
    try {
      // 권한 요청
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
        return;
      }

      // 이미지 선택 (여러 장 가능)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const imageUris = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...imageUris]);
        console.log(`📸 선택된 이미지: ${imageUris.length}개`);
      }
    } catch (error) {
      console.error("이미지 선택 오류:", error);
      Alert.alert("오류", "이미지를 선택하는 중 문제가 발생했습니다.");
    }
  };

  // 이미지 제거
  const removeImage = (uri: string) => {
    setSelectedImages(prev => prev.filter(img => img !== uri));
  };

  // 이미지를 Base64로 변환
  const imageToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert image'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Base64 변환 오류:", error);
      throw error;
    }
  };

  // 정보 등록 (API 호출)
  const handleSubmit = async () => {
    console.log("🔘 버튼 클릭됨!");
    console.log("입력된 링크:", blogLink);
    console.log("선택된 이미지:", selectedImages.length);

    // 링크와 이미지 중 하나는 필수
    if (!blogLink.trim() && selectedImages.length === 0) {
      Alert.alert("알림", "웹페이지 링크 또는 이미지를 입력해주세요.");
      return;
    }

    // URL 유효성 검증 (링크가 있을 경우)
    if (blogLink.trim() && !blogLink.includes('http://') && !blogLink.includes('https://')) {
      Alert.alert("알림", "올바른 URL을 입력해주세요. (http:// 또는 https://로 시작)");
      return;
    }

    setLoading(true);
    console.log("⏳ 로딩 시작...");

    try {
      let linkData = null;
      let imageData = null;

      // 1️⃣ 링크 분석 (있을 경우)
      if (blogLink.trim()) {
        console.log("📤 링크 분석 요청 중...");
        const linkResponse = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ link: blogLink.trim() }),
        });

        console.log("📥 링크 분석 응답 상태:", linkResponse.status);

        if (!linkResponse.ok) {
          const errorText = await linkResponse.text();
          console.error("서버 에러 응답:", errorText);
          throw new Error(`링크 분석 오류: ${linkResponse.status}`);
        }

        const data = await linkResponse.json();
        if (data.success) {
          linkData = data.event;
          console.log("✅ 링크 분석 성공!");
        }
      }

      // 2️⃣ 이미지 분석 (있을 경우)
      if (selectedImages.length > 0) {
        console.log("📤 이미지 분석 요청 중...");
        console.log(`📸 이미지 개수: ${selectedImages.length}`);

        // 이미지를 Base64로 변환
        const base64Images = await Promise.all(
          selectedImages.map(uri => imageToBase64(uri))
        );

        const imageResponse = await fetch(IMAGE_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: base64Images }),
        });

        console.log("📥 이미지 분석 응답 상태:", imageResponse.status);

        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          console.error("서버 에러 응답:", errorText);
          throw new Error(`이미지 분석 오류: ${imageResponse.status}`);
        }

        const data = await imageResponse.json();
        if (data.success) {
          imageData = data.goods;
          console.log("✅ 이미지 분석 성공!");
        }
      }

      // 3️⃣ 데이터 병합
      const mergedData = {
        ...linkData,
        goods_list: imageData?.goods_list || [],
        event_benefits: [
          ...(linkData?.event_benefits || []),
          ...(imageData?.event_benefits || [])
        ]
      };

      console.log("📊 최종 병합 데이터:", JSON.stringify(mergedData, null, 2));
      setResponseData(mergedData);

      // 4️⃣ Main 화면으로 이동
      router.push({
        pathname: "/Main",
        params: {
          eventData: JSON.stringify(mergedData)
        }
      });

    } catch (error: any) {
      console.error("❌ 오류 발생:", error);
      console.error("오류 상세:", error.message);
      
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        Alert.alert(
          "연결 오류", 
          `서버에 연결할 수 없습니다.\n\n확인사항:\n1. 서버가 실행 중인가요?\n2. API_URL이 올바른가요?\n3. 같은 네트워크에 연결되어 있나요?`
        );
      } else {
        Alert.alert("오류", error.message || "분석 중 문제가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      console.log("⏹️ 로딩 종료");
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
              행사에 대한 링크와 이미지를 올리면 {'\n'}
              AI가 자동 정리해줘요
            </Text>
          </View>
          <View style={styles.tabContentSeparator} />
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
              keyboardType="url"
            />
            
            {/* 안내 메시지 */}
            <View style={styles.warningBox}>
              <View style={styles.warningIcon}>
                <Ionicons name="information-circle-outline" size={14} color="#616161" />
              </View>
              <Text style={styles.warningText}>
                ‘X’의 정보는 읽을 수 없어요.
              </Text>
            </View>
          </View>
          <View style={styles.tabContentSeparator} />
          {/* 이미지 업로드 섹션 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>행사 관련 공지 이미지</Text>
            
            <TouchableOpacity 
              style={styles.imageUploadBox}
              onPress={pickImages}
              disabled={loading}
            >
              <Ionicons name="image-outline" size={16} color="#CECECE" />
              <Text style={styles.uploadTextActive}>사진을 업로드해주세요.</Text>
            </TouchableOpacity>

            {/* 선택된 이미지 목록 */}
            {selectedImages.length > 0 && (
              <View style={styles.imagePreviewContainer}>
                <Text style={styles.imageCountText}>
                  선택된 이미지: {selectedImages.length}개
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedImages.map((uri, index) => (
                    <View key={index} style={styles.imagePreviewWrapper}>
                      <Image source={{ uri }} style={styles.imagePreview} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => removeImage(uri)}
                      >
                        <Ionicons name="close-circle" size={16} color="rgba(0, 0, 0, 0.70)" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}


          </View>

          {/* 등록 버튼 */}
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

         
          {/* <View style={styles.debugBox}>
            <Text style={styles.debugText}>🔧 링크 API: {API_URL}</Text>
            <Text style={styles.debugText}>🖼️ 이미지 API: {IMAGE_API_URL}</Text>
            <Text style={styles.debugText}>📝 링크 길이: {blogLink.length}자</Text>
            <Text style={styles.debugText}>📸 이미지 개수: {selectedImages.length}개</Text>
            <Text style={styles.debugText}>⏳ 로딩 상태: {loading ? "실행중" : "대기중"}</Text>
          </View> */}

          {/* {responseData && (
            <View style={styles.jsonContainer}>
              <Text style={styles.jsonTitle}>📊 분석된 행사 정보:</Text>
              <ScrollView style={styles.jsonScrollView} nestedScrollEnabled={true}>
                <Text style={styles.jsonText}>
                  {JSON.stringify(responseData, null, 2)}
                </Text>
              </ScrollView>
            </View>
          )} */}
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
    tabContentSeparator: { height: 1, backgroundColor: '#E0E0E0', marginTop:40, marginBottom:40 },
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
    marginTop: 71,
    gap: 8,
    //marginBottom: 40,
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
    //marginTop: 40,
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
    //marginBottom: 12,
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

  imageUploadBox: {
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  uploadTextActive: {
    fontSize: 12,
    fontWeight: "600",
    color: "#CECECE",
  },

  imagePreviewContainer: {
    gap: 8,
  },

  imageCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },

  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 8,
  },

  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },

  removeImageButton: {
    position: 'absolute',
    top: 4,
    right:4,
    borderRadius: 8,
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

  debugBox: {
    backgroundColor: "#FFF9E6",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE066",
    gap: 4,
  },

  debugText: {
    fontSize: 11,
    color: "#666",
    fontFamily: "monospace",
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