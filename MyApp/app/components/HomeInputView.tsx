import React from "react";
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    ScrollView,
    Alert,
    Image,
    ActivityIndicator // 로딩 상태를 위한 import 추가
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ViewState } from "../data/types"; // ViewState 타입 필요
import * as ImagePicker from 'expo-image-picker'; // 이미지 피커 import 추가

/**
 * HomeInputView에서 사용할 Props 정의
 */
interface HomeInputViewProps {
    /** 뷰 전환을 위한 함수 (예: 'DEFAULT' 또는 'DETAIL'로 이동) */
    onNavigate: (view: ViewState) => void;
    /** AI 분석 시작을 요청하는 함수. (링크, 이미지 URI 목록을 전달) */
    onAnalyze: (link: string, images: string[]) => Promise<void>; 
    /** 로딩 상태 */
    isLoading: boolean; // 로딩 상태를 prop으로 받도록 추가
}

const HomeInputView: React.FC<HomeInputViewProps> = ({ onAnalyze, onNavigate, isLoading }) => {
    const [link, setLink] = React.useState("");
    const [images, setImages] = React.useState<string[]>([]); // selectedImages -> images 로 통일
    
    // 버튼 활성화/비활성화 상태 변수: 링크 또는 이미지가 하나라도 있을 경우 활성화
    const isButtonDisabled = !link.trim() && images.length === 0 || isLoading;

    // 이미지 선택 함수 (EnterInfo.tsx 로직 복원)
    const pickImages = async () => {
        if (isLoading) return;

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
                base64: true, // Base64 변환을 위한 옵션이지만, 여기서는 URI만 사용
            });

            if (!result.canceled && result.assets) {
                const imageUris = result.assets.map(asset => asset.uri);
                setImages(prev => [...prev, ...imageUris]);
            }
        } catch (error) {
            console.error("이미지 선택 오류:", error);
            Alert.alert("오류", "이미지를 선택하는 중 문제가 발생했습니다.");
        }
    };

    // 이미지 제거 함수 (EnterInfo.tsx 로직 복원)
    const removeImage = (uri: string) => {
        if (isLoading) return;
        setImages(prev => prev.filter(img => img !== uri));
    };


    const handleSubmit = async () => { // async 함수로 변경
        const trimmedLink = link.trim();
        
        // 1. 링크와 이미지 중 하나는 필수 (EnterInfo.tsx 로직 복원)
        if (!trimmedLink && images.length === 0) {
            Alert.alert("알림", "웹페이지 링크 또는 이미지를 입력해주세요.");
            return;
        }

        // 2. URL 유효성 검증 (링크가 있을 경우) (EnterInfo.tsx 로직 복원)
        if (trimmedLink && !trimmedLink.includes('http://') && !trimmedLink.includes('https://')) {
            Alert.alert("알림", "올바른 URL을 입력해주세요. (http:// 또는 https://로 시작)");
            return;
        }
        
        // 3. onAnalyze 호출 (HomeInputViewProps 명세 유지)
        await onAnalyze(trimmedLink, images);
        
        // 분석 요청 후 필드 초기화 (선택 사항)
        setLink("");
        setImages([]);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.contentContainer} style={styles.container}>
                
                {/* 상단 로고 */}
                <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain"/>

                
                {/* 메인 타이틀/설명 영역 */}
                <View style={styles.mainHeaderArea}>
                    <Text style={styles.mainTitle}>
                        행사 관련 공식 게시물의 링크를 올려주세요
                    </Text>
                    <Text style={styles.mainSubtitle}>
                        모든 웹페이지 링크(블로그, SNS, 공식 페이지 등)와 이미지를 올리면{"\n"}AI가 자동으로 행사 정보를 정리해드립니다.
                    </Text>
                </View>

                <View style={styles.sectionDivider} />

                {/* 1. 행사 관련 공지 링크 입력 필드 */}
                <View style={styles.inputSection}>
                    <Text style={styles.inputTitle}>행사 관련 공지 링크</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="링크를 입력해주세요."
                        placeholderTextColor="#CECECE"
                        value={link}
                        onChangeText={setLink}
                        keyboardType="url"
                        autoCapitalize="none"
                        editable={!isLoading} // 로딩 중 비활성화
                        onSubmitEditing={handleSubmit}
                    />
                    {/* 안내 메시지 */}
                    <View style={styles.errorTextWrapper}>
                        <Ionicons name="information-circle-outline" size={14} color="#494949" />
                        <Text style={styles.errorText}>일부 사이트는 접근 제한(로그인/스크립트 등)으로 내용 추출이 어려울 수 있습니다.</Text>
                    </View>
                </View>

                <View style={styles.sectionDivider} />

                {/* 2. 행사 관련 공지 이미지 업로드 필드 */}
                <View style={styles.inputSection}>
                    <Text style={styles.inputTitle}>행사 관련 공지 이미지</Text>
                    <TouchableOpacity 
                        style={styles.imageUploadMock}
                        onPress={pickImages} // 이미지 선택 함수 연결
                        disabled={isLoading} // 로딩 중 비활성화
                    >
                        <Ionicons name="image-outline" size={24} color="#CECECE" />
                        <Text style={styles.uploadText}>사진을 업로드해주세요.</Text>
                    </TouchableOpacity>

                    {/* 선택된 이미지 목록 표시 (EnterInfo.tsx 로직 복원) */}
                    {images.length > 0 && (
                        <View style={styles.imagePreviewContainer}>
                            <Text style={styles.imageCountText}>
                                선택된 이미지: {images.length}개
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
                                {images.map((uri, index) => (
                                    <View key={index} style={styles.imagePreviewWrapper}>
                                        <Image source={{ uri }} style={styles.imagePreview} />
                                        <TouchableOpacity 
                                            style={styles.removeImageButton}
                                            onPress={() => removeImage(uri)}
                                            disabled={isLoading}
                                        >
                                            <Ionicons name="close-circle" size={16} color="rgba(0, 0, 0, 0.70)" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>
                
                {/* 하단 분석 요청 버튼 (정보 등록하기) */}
                <TouchableOpacity 
                    onPress={handleSubmit}
                    style={[
                        styles.submitButton, 
                        isButtonDisabled && styles.submitButtonDisabled
                    ]}
                    disabled={isButtonDisabled}
                >
                    {isLoading ? ( // 로딩 상태에 따라 UI 변경
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color="#fff" />
                            <Text style={styles.submitButtonText}>분석 중...</Text>
                        </View>
                    ) : (
                        <Text style={styles.submitButtonText}>정보 등록하기</Text>
                    )}
                </TouchableOpacity>
                
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: "#fff" 
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 220, // 하단 버튼 및 네비게이션 공간 확보
    },
    
    // 로고
    logo: { width: 123, height: 22, marginBottom: 71 },

    // 메인 헤더 영역
    mainHeaderArea: {
        marginBottom: 40,
    },
    mainTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        lineHeight: 30,
    },
    mainSubtitle: {
        fontSize: 14,
        color: '#616161',
        marginTop: 8,
        lineHeight: 20,
    },

    sectionDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
    },

    // 입력 필드 섹션
    inputSection: {
        marginTop:40,
        marginBottom: 30,
    },
    inputTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 10,
    },
    textInput: {
        backgroundColor: '#EFEFEF',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 15,
        fontSize: 14,
        color: '#333',
        height: 50,
        borderWidth: 0, 
    },
    
    // 에러 메시지 목업
    errorTextWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    errorText: {
        fontSize: 12,
        color: '#494949',
        marginLeft: 5,
    },

    // 이미지 업로드 목업 (EnterInfo.tsx의 imageUploadBox와 스타일 유사하게 조정)
    imageUploadMock: {
        backgroundColor: '#EFEFEF',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 15,
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10, // 아이콘과 텍스트 간격 조정
    },
    uploadText: {
        fontSize: 14,
        color: '#CECECE',
        // marginLeft: 10, // imageUploadMock에 gap 설정으로 제거
    },

    // 선택된 이미지 목록 스타일 (EnterInfo.tsx에서 복원)
    imagePreviewContainer: {
        marginTop: 12,
        gap: 8,
    },
    imageCountText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#333",
    },
    imageScrollView: {
        marginTop: 4, // 간격 추가
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
        right: 4,
        borderRadius: 8,
    },
    // (EnterInfo.tsx의 submitButton styles 복사)
    loadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center", // 중앙 정렬 추가
        width: '100%', // 버튼 너비 전체 사용
    },

    // 정보 등록하기 버튼
    submitButton: {
        backgroundColor: '#FF59AD',
        width:'100%', 
        height:44,
        justifyContent: 'center', // 텍스트/로딩 컨테이너 중앙 정렬
        paddingVertical: 13,
        borderRadius: 10,
        alignItems: 'center',
        alignSelf: 'center', 
        marginTop: 20, 
    },
    submitButtonDisabled: {
        backgroundColor: '#E0E0E0', 
        opacity: 0.6, 
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default HomeInputView;