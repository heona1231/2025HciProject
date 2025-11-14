// app/index.tsx
import { View, Text, TextInput, Button } from "react-native";
import { useState } from "react";
import { router } from "expo-router";

export default function Index() {
  const [name, setName] = useState("");

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>이름을 입력하세요</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="이름"
        style={{
          borderWidth: 1,
          borderColor: "#999",
          borderRadius: 8,
          padding: 10,
          marginBottom: 20,
        }}
      />

      <Button title="다음으로" onPress={() => router.push("/onboarding")} />
    </View>
  );
}
