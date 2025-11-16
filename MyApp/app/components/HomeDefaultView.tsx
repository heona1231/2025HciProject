import * as React from "react";
import { Text, StyleSheet, View, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ViewState, EventData } from "../data/types"; // 타입 임포트

// Props 타입 정의
interface HomeDefaultViewProps {
    onNavigate: (view: ViewState, data?: EventData) => void;
}

// 임시 행사 데이터 (실제로는 home.tsx에서 관리해야 합니다.)
const DUMMY_EVENTS: { name: string; data: EventData }[] = [
    { 
        name: "가나디's 쿠킹클래스", 
        data: { event_title: "가나디's 쿠킹클래스" } as EventData 
    },
    { 
        name: "신년 행사", 
        data: { event_title: "신년 행사" } as EventData 
    },
    { 
        name: "겨울 마켓", 
        data: { event_title: "겨울 마켓" } as EventData 
    },
];

const HomeDefaultView: React.FC<HomeDefaultViewProps> = ({ onNavigate }) => {
    const [open, setOpen] = React.useState(false);
    const [selectedEventName, setSelectedEventName] = React.useState(DUMMY_EVENTS[0].name);

    return (
        <View style={styles.container}>
            {/* 로고 */}
            <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain"/>

            {/* 드롭다운 */}
            <View style={styles.dropdownWrapper}>
                <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => setOpen(!open)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.dropdownText}>{selectedEventName || "행사를 선택해주세요."}</Text>
                    <Ionicons name="chevron-down" size={20} color="#616161" />
                </TouchableOpacity>

                {open && (
                    <View style={styles.dropdownList}>
                        {DUMMY_EVENTS.map((item: { name: string; data: EventData }, index: number) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setSelectedEventName(item.name);
                                    setOpen(false);
                                    onNavigate('DETAIL', item.data); 
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.dropdownItemText}>{item.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* 메인 콘텐츠 */}
            <View style={styles.mainContent}>
                <Text style={styles.mainTitle}>행사 정보가 존재하지 않아요.</Text>
                <Text style={styles.mainSubtitle}>첫 정보를 입력해볼까요?</Text>
                
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => onNavigate('INPUT')} // 입력 뷰로 전환 요청
                    activeOpacity={0.7}
                >
                    <Text style={styles.addButtonText}>행사 추가하기</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 56 }, // SafeAreaView 제외한 내부 컨테이너
    logo: { width: 123, height: 22, marginBottom: 28 },

    dropdownWrapper: { position: 'relative', zIndex: 10 }, 
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
    dropdownList: { 
        backgroundColor: "#fff", 
        marginTop: 4, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: "#ddd",
        position: 'absolute', 
        top: 44, 
        left: 0, 
        right: 0, 
        zIndex: 10 
    },
    dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
    dropdownItemText: { fontSize: 12, color: "#333" },

    mainContent: { marginTop: 200 },
    mainTitle: { fontSize: 20, fontWeight: "600", color: "#000", marginBottom: 4 , marginLeft: 16 },
    mainSubtitle: { fontSize: 16, color: "#000", marginBottom: 16, marginLeft: 16 },
    addButton: { backgroundColor: "#FF59AD", width: 114, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", marginLeft:16 },
    addButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});

export default HomeDefaultView;