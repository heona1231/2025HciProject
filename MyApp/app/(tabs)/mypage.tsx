// app/(tabs)/mypage.tsx
import { View, Text, Button } from "react-native";
import { router } from "expo-router";

export default function MyPage() {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>마이페이지</Text>
    </View>
  );
}
