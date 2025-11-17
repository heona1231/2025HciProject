// /screens/home.tsx

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import axios from 'axios';
// 1단계에서 정의한 타입 임포트
import { ViewState, EventData, SimpleEventCardData } from '../data/types';
// 이전에 정의한 뷰 컴포넌트 임포트
import HomeInputView from '../components/HomeInputView';
import HomeDetailView from '../components/HomeDetailView';
import HomeDefaultView from '../components/HomeDefaultView'; // HomeDefaultView 임포트
import { useEventContext } from '../context/EventContext';
declare module 'expo-file-system' {
  export enum EncodingType {
    UTF8 = 'utf8',
    Base64 = 'base64',
  }
}

// AI 서버 주소 동적 결정: Expo 디바이스/에뮬레이터/로컬 테스트 환경에 맞춰 자동 선택
const DEFAULT_PORT = 4000;
function getAiServerUrl() {
    // 1) 사용자가 앱 설정으로 제공한 값 (expo config extra 등)
    try {
        const manifest: any = Constants.manifest || (Constants as any).expoConfig || {};
        const extraUrl = manifest?.extra?.AI_SERVER_URL;
        if (extraUrl) return extraUrl;

        // 2) Expo 개발 환경: debuggerHost (예: 192.168.0.5:19000)
        const debuggerHost = manifest?.debuggerHost || manifest?.packagerOpts?.packagerHost;
        if (debuggerHost && typeof debuggerHost === 'string') {
            const host = debuggerHost.split(':')[0];
            return `http://${host}:${DEFAULT_PORT}`;
        }
    } catch (e) {
        // ignore and fallback
    }

    // 3) Android emulator special host
    if (Platform.OS === 'android') {
        // Android emulator: 10.0.2.2 maps to host machine
        return `http://10.0.2.2:${DEFAULT_PORT}`;
    }

    // 4) 기본 로컬호스트 (iOS simulator or when running in same host)
    return `http://localhost:${DEFAULT_PORT}`;
}

const AI_SERVER_URL = getAiServerUrl();
console.log('AI_SERVER_URL 사용:', AI_SERVER_URL);


// ----------------------------------------------------------------------
// 데이터 관련 함수
// ----------------------------------------------------------------------

const createDummyEventData = (link: string, images: string[]): EventData => ({
    event_title: "AI 분석 결과: " + (link.length > 10 ? link.substring(0, 10) + "..." : link || "이미지 분석 결과"),
    official_link: link,
    event_overview: {
        address: "서울 강남구 코엑스",
        date_range: "2025.12.01(월) ~ 2025.12.05(금)",
        duration_days: 5,
        daily_hours: "10:00~19:00"
    },
    reservation_info: {
        open_date: "2025-11-20 10:00",
        method: "티켓링크 선착순",
        notes: "예매 전 본인 인증 필수"
    },
    entrance_info: {
        entry_time: "행사 1시간 전",
        entry_method: "QR 코드 확인 후 입장",
        entry_items: ["QR 티켓", "신분증"]
    },
    event_contents: [
        { title: "오프닝 세리머니", description: "화려한 오프닝 공연과 함께 행사 시작을 알립니다." },
        { title: "작가 사인회", description: "유명 웹툰 작가들의 사인회가 3일간 진행됩니다." }
    ],
    event_benefits: [],
    goods_list: [],
    uploaded_images: images
    // 🔥 주의: goods_stock_info, goods_popularity_rank는 Mock 데이터이므로 제거됨
    // 실제 데이터는 HomeDetailView의 fetchPastEvents에서 API 호출로 가져오거나
    // 서버 응답(링크/이미지 분석)에서 받아야 함
});


const mergeAnalysisData = (linkData: any, imageData: any): EventData => {
    const mergedData: EventData = linkData as EventData;

    const imageGoodsList = imageData?.goods?.goods_list || [];
    if (imageGoodsList.length > 0) {
    mergedData.goods_list = imageGoodsList; // 기존 goods_list 덮어쓰기
    mergedData.image_goods_list = imageGoodsList;
} 
else {
        mergedData.goods_list = mergedData.goods_list || [];
    }

    const linkBenefits = mergedData.event_benefits || [];
    const imageBenefits = imageData?.goods?.event_benefits || [];

    // Keep image-derived benefits separately for transparency, but merge into
    // the main event_benefits list (deduped) so UI that expects a single list still works.
    mergedData.image_event_benefits = imageBenefits;
    const allBenefits = [...(linkBenefits || []), ...(imageBenefits || [])];
    mergedData.event_benefits = Array.from(new Set(allBenefits.filter(b => b && String(b).trim() !== '')));

    mergedData.uploaded_images = imageData?.uploaded_images || [];

    // 🔥 Mock 데이터 제거: goods_stock_info, goods_popularity_rank는 서버/API에서만 받아야 함
    // 만약 링크 분석 결과에서 이미 있다면 유지, 없으면 undefined
    // (mypage에서 로딩 상태가 제대로 작동하도록 undefined 상태 유지 필수)

    return mergedData;
};
// ----------------------------------------------------------------------


// 메인 컨테이너 컴포넌트
const HomeScreen: React.FC = () => {
    const [currentView, setCurrentView] = useState<ViewState>('DEFAULT');
    // 전역 컨텍스트 사용
    const { eventData, setEventData, imageAnalysisData, setImageAnalysisData } = useEventContext();
    const [isLoading, setIsLoading] = useState(false);

    /**
     * ViewState를 변경하는 함수 (onNavigate, onBack으로 사용됨)
     */
    const handleNavigate = useCallback((view: ViewState) => {
        setCurrentView(view);
        // DETAIL 뷰에서 DEFAULT로 돌아갈 때는 데이터 초기화
        if (view === 'DEFAULT') {
            setEventData(null);
            setImageAnalysisData(null);
        }
    }, []);

    /**
     * HomeInputView에서 분석 요청 시 호출되는 함수 (AI 서버 통신 및 데이터 병합)
     */
    /**
     * HomeInputView에서 분석 요청 시 호출되는 함수 (AI 서버 통신 및 데이터 병합)
     */
    /**
     * HomeInputView에서 분석 요청 시 호출되는 함수 (AI 서버 통신 및 데이터 병합)
     */
    const handleAnalyze = useCallback(async (link: string, images: string[]) => {
        setIsLoading(true);

        let eventDataResponse: any = null;
        // 🚨 goodsDataResponse 타입 명시: goods 속성이 포함된 객체 또는 null
        let goodsDataResponse: {
            goods?: { goods_list: any[], event_benefits: any[] },
            uploaded_images?: string[]
        } | null = null;

        try {
            // 1-1. 링크 분석 (필요시)
            if (link.trim()) {
                const linkResponse = await fetch(`${AI_SERVER_URL}/analyze`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ link }),
                });

                const linkJson = await linkResponse.json();
                if (!linkResponse.ok || !linkJson.success) {
                    throw new Error(`링크 분석 실패: ${linkJson.error || linkResponse.statusText}`);
                }
                eventDataResponse = linkJson.event;
                eventDataResponse.official_link = link;
            }
                // 1-2. 이미지 분석 (필요시)
                if (images.length > 0) {
                    console.log('📤 이미지 Base64 변환 시작:', images.length, '개');
                    const base64Images: string[] = [];
                    
                    for (let i = 0; i < images.length; i++) {
                        const imageUri = images[i];
                        console.log(`📎 이미지 ${i + 1}:`, imageUri.slice(-50));
                        
                        try {
                            // 🔥 방법 1: FileSystem 사용 (더 간단하고 안정적)
                            const base64Data = await FileSystem.readAsStringAsync(imageUri, { 
                                encoding: FileSystem.EncodingType.Base64
                            });
                            
                            // MIME 타입 결정
                            const mimeType = imageUri.toLowerCase().endsWith('.png') 
                                ? 'image/png' 
                                : 'image/jpeg';
                            
                            // Data URI 형식으로 변환
                            const dataUri = `data:${mimeType};base64,${base64Data}`;
                            base64Images.push(dataUri);
                            
                            const sizeKB = Math.round(base64Data.length / 1024);
                            console.log(`✅ 이미지 ${i + 1} 변환 완료 (${sizeKB}KB)`);
                            
                        } catch (err) {
                            console.error(`❌ 이미지 ${i + 1} Base64 변환 실패:`, err);
                            
                            // 🔥 방법 2: fetch + Blob 방식으로 재시도 (폴백)
                            try {
                                console.log(`🔄 이미지 ${i + 1} Blob 방식으로 재시도...`);
                                const response = await fetch(imageUri);
                                const blob = await response.blob();
                                
                                const base64String = await new Promise<string>((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        if (typeof reader.result === 'string') {
                                            resolve(reader.result);
                                        } else {
                                            reject(new Error('Base64 변환 실패'));
                                        }
                                    };
                                    reader.onerror = reject;
                                    reader.readAsDataURL(blob);
                                });
                                
                                base64Images.push(base64String);
                                console.log(`✅ 이미지 ${i + 1} Blob 방식으로 변환 완료`);
                                
                            } catch (blobErr) {
                                console.error(`❌ 이미지 ${i + 1} Blob 방식도 실패:`, blobErr);
                                Alert.alert("오류", `이미지 ${i + 1}을(를) 처리할 수 없습니다.`);
                                setIsLoading(false);
                                return;
                            }
                        }
                    }
                    
                    if (base64Images.length === 0) {
                        Alert.alert("오류", "변환된 이미지가 없습니다.");
                        setIsLoading(false);
                        return;
                    }
                    
                    console.log('📤 서버로 전송 중...');
                    console.log('📤 URL:', `${AI_SERVER_URL}/analyze-image`);
                    console.log('📤 이미지 개수:', base64Images.length);
                    
                    try {
                        const imageResponse = await axios.post(
                            `${AI_SERVER_URL}/analyze-image`,
                            { images: base64Images },
                            {
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                timeout: 120000, // 120초
                            }
                        );
                        
                        console.log('📥 응답 상태:', imageResponse.status);
                        
                        if (imageResponse.data && imageResponse.data.success) {
                            console.log('✅ 이미지 분석 성공!');
                            console.log('📊 굿즈:', imageResponse.data.goods?.goods_list?.length || 0, '개');
                            console.log('📊 특전:', imageResponse.data.goods?.event_benefits?.length || 0, '개');
                            
                            goodsDataResponse = imageResponse.data;
                            setImageAnalysisData(imageResponse.data);
                            // 디버깅: 이미지 분석 결과의 주요 필드 확인
                            console.log('DEBUG imageAnalysisData.uploaded_images:', imageResponse.data.uploaded_images);
                            console.log('DEBUG imageAnalysisData.goods_list:', imageResponse.data.goods?.goods_list?.length);
                        } else {
                            throw new Error(`이미지 분석 실패: ${imageResponse.data?.error || '알 수 없는 오류'}`);
                        }
                        
                    } catch (imgErr: any) {
                        console.error('❌ 이미지 분석 오류:', imgErr.message);
                        
                        if (imgErr.response) {
                            console.error('📥 서버 응답:', imgErr.response.status, imgErr.response.data);
                            Alert.alert("분석 실패", `서버 오류: ${imgErr.response.data?.error || imgErr.response.statusText}`);
                        } else if (imgErr.request) {
                            console.error('📥 요청 전송했으나 응답 없음');
                            Alert.alert("네트워크 오류", "서버에 연결할 수 없습니다.");
                        } else {
                            Alert.alert("오류", `이미지 분석 중 오류: ${imgErr.message}`);
                        }
                        
                        throw imgErr;
                    }
                }
            // 🚨 데이터가 아예 없는 경우 처리
            // 링크 분석 또는 이미지 분석 중 적어도 하나가 성공해야 진행합니다.
            if (!eventDataResponse && !goodsDataResponse) {
                Alert.alert("분석 실패", "입력된 정보에서 행사 관련 데이터를 추출하지 못했습니다.");
                return;
            }

            // 2. 데이터 병합 및 DetailView로 전환
            let baseData = eventDataResponse || createDummyEventData(link, images);

            const finalEventData = mergeAnalysisData(baseData, goodsDataResponse);

            // 2-1. 데이터 저장 (전역 컨텍스트)
            // 디버깅: finalEventData에 필요한 필드가 포함되어 있는지 로그로 확인
            console.log('DEBUG finalEventData.goods_stock_info:', finalEventData.goods_stock_info);
            console.log('DEBUG finalEventData.goods_popularity_rank:', finalEventData.goods_popularity_rank);
            console.log('DEBUG finalEventData.uploaded_images (length):', finalEventData.uploaded_images?.length);
            setEventData(finalEventData);

            // If imageAnalysisData exists but not set (edge cases), ensure it's preserved
            if (!imageAnalysisData && goodsDataResponse) setImageAnalysisData(goodsDataResponse);

            // 2-2. 뷰 전환
            setCurrentView('DETAIL');

        } catch (error) {
            // 🚨 오류 메시지 처리 로직
            let errorMessage = "알 수 없는 오류가 발생했습니다.";
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }

            console.error("Analysis Error:", error);
            // 경고는 보여주되, 사용자의 입력(링크/이미지)은 유지하고
            // 부분 결과가 있으면 상세화면으로 보여줍니다.
            Alert.alert("분석 오류", `AI 분석 중 오류가 발생했습니다: ${errorMessage}`);

            if (eventDataResponse || goodsDataResponse) {
                try {
                    const baseData = eventDataResponse || createDummyEventData(link, images);
                    const finalEventData = mergeAnalysisData(baseData, goodsDataResponse);
                    // 에러 발생 후 병합한 데이터 저장 (디버깅 로그 추가)
                    console.log('DEBUG (error path) finalEventData.goods_stock_info:', finalEventData.goods_stock_info);
                    console.log('DEBUG (error path) finalEventData.goods_popularity_rank:', finalEventData.goods_popularity_rank);
                    console.log('DEBUG (error path) finalEventData.uploaded_images (length):', finalEventData.uploaded_images?.length);
                    setEventData(finalEventData);
                    setCurrentView('DETAIL');
                } catch (mergeErr) {
                    console.error('병합 중 추가 오류:', mergeErr);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 현재 뷰에 따라 렌더링할 컴포넌트 결정
    const renderContent = useMemo(() => {
        if (isLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF59AD" />
                    <Text style={styles.loadingText}>AI가 행사 정보를 분석 중입니다...</Text>
                </View>
            );
        }

        switch (currentView) {
            case 'DEFAULT':
                // HomeDefaultView 사용
                return <HomeDefaultView onNavigate={handleNavigate} />;
            case 'INPUT':
                return (
                    <HomeInputView
                        onAnalyze={handleAnalyze}
                        onNavigate={handleNavigate}
                        isLoading={isLoading}
                    />
                );
            case 'DETAIL':
                if (eventData) {
                    return <HomeDetailView data={eventData} imageData={imageAnalysisData} onBack={handleNavigate} />;
                }
                // 데이터가 없거나 에러 발생 시 다시 기본 뷰로
                return <HomeDefaultView onNavigate={handleNavigate} />;
        }
    }, [currentView, eventData, isLoading, handleAnalyze, handleNavigate, imageAnalysisData]);

    return (
        <SafeAreaView style={styles.safeArea}>
            {renderContent}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#fff"
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#333',
    },
    // ⚠️ 참고: HomeDefaultView로 이동해야 하는 스타일은 삭제하거나 해당 파일로 옮겨주세요.
});

export default HomeScreen;