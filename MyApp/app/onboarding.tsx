// app/onboarding.tsx
import { View, Text, Button } from "react-native";
import { router } from "expo-router";

export default function Onboarding() {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>온보딩 화면</Text>
      <Text style={{ marginBottom: 20 }}>
        앱 사용 방법을 간단히 보여주는 화면입니다.
      </Text>

      <Button title="시작하기" onPress={() => router.replace("/(tabs)/home")} />
    </View>
  );
}
