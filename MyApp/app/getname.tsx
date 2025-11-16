// app/onboarding/name.tsx
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image } from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";

export default function NameDefault() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");

  const handleNext = () => {
    if (nickname.trim()) {
      router.push("/onboarding");
    }
  };

  return (
    
    <View style={styles.container}>
      {/* 로고 */}
      <Image 
        source={require("../assets/images/logo.png")} 
        style={styles.logo} 
        resizeMode="contain"
      />

      {/* 인사말 */}
      <Text style={styles.greeting}>
        반가워요!{'\n'}사용할 닉네임을 입력해주세요.
      </Text>

      {/* 하단 입력 영역 */}
      <View style={styles.inputSection}>
        <TextInput
          style={styles.textField}
          placeholder="닉네임을 입력해주세요."
          placeholderTextColor="#999"
          value={nickname}
          onChangeText={setNickname}
        />

        <TouchableOpacity
          style={[
            styles.button,
            nickname.trim() && styles.buttonActive
          ]}
          onPress={handleNext}
          disabled={!nickname.trim()}
        >
          <Text style={styles.buttonText}>다음으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  
  logo: {
    width: 214,
    height: 39,
    marginBottom: 24,
  },

  greeting: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    lineHeight: 28,
    marginBottom: 60,
  },

  inputSection: {
    width: "100%",
  },

  textField: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 12,
    paddingHorizontal: 4,
    fontSize: 14,
    color: "#000",
    marginBottom: 24,
  },

  button: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    backgroundColor: "#EFEFEF",
    justifyContent: "center",
    alignItems: "center",
  },

  buttonActive: {
    backgroundColor: "#FF59AD",
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});