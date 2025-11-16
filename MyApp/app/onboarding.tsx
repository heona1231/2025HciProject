// app/onboarding/index.tsx
import { View, Text, Image, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";

export default function OnboardingSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCompleteEnabled, setIsCompleteEnabled] = useState(false);

  const handleCreateStart = () => {
    setIsCreateMode(true);
  };
  const handleRegister = () => {
    if (query && !options.includes(query)) {
      setOptions([...options, query]);
      setIsCreateMode(false);
      setShowCreate(false);
    }
  };
  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    setIsCompleteEnabled(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.upperFrame}>
        <Image source={require("../assets/logo.png")} style={styles.logo} resizeMode="contain"/>
        
        <View style={styles.textGroup}>
          <Text style={styles.head2}>장르를 선택해주세요.</Text>
          <Text style={styles.caption2}>{isCreateMode ? "당신만의 장르를 자유롭게 입력해보세요." : "해당 장르에 대한 오프라인 행사 굿즈 정보를 모아드려요!"}</Text>  
        </View>
      </View>

      <View style={styles.lowerFrame}>
        <TextInput style={styles.textField}
          placeholder="원하는 장르를 입력해주세요." placeholderTextColor={"#616161"}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setShowCreate(text.length > 0 && !options.includes(text));
          }}
        ></TextInput>

        {showCreate && !isCreateMode && (
          <View style={styles.noResultBox}>
            <Text style={styles.caption2}>장르가 존재하지 않아요!  </Text>
            <TouchableOpacity onPress={handleCreateStart}>
              <Text style={[styles.caption2, { color: "#FF59AD" }]}>지금 바로 생성해보세요.  &gt;</Text>
            </TouchableOpacity>
          </View>
        )}
        {isCreateMode && (
          <View style={styles.createBox}>
            <Text style={[styles.caption2, {color:"#616161"}]}>{query}</Text>
          </View>
        )}
        {!isCreateMode && (
          <View style={styles.optionsContainer}>
            {options.map((item, index) => (
              <TouchableOpacity key={index} style={[
                styles.optionButton,
                selectedOption === item && [styles.optionButton, {backgroundColor: "#FF59AD"}]]}
                onPress={()=>handleSelectOption(item)}>
                <Text style={[styles.caption2, selectedOption === item && [styles.caption2, {color:"white"}]]}>
                  {item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!isCreateMode &&(
          <TouchableOpacity style={[styles.button1, isCompleteEnabled && [styles.button1, {backgroundColor: "#FF59AD"}]]}
          onPress={() => {
            if (isCompleteEnabled) {
              router.push("/home"); // HomePage로 이동
            }
          }}>
            <Text style={[styles.caption2, isCompleteEnabled && [styles.caption2, {color:"white"}]]}>선택 완료하기</Text>
          </TouchableOpacity>
        )}
        {isCreateMode &&(
          <TouchableOpacity onPress={handleRegister} style={[styles.button1, {backgroundColor: "#FF4D8C"}]}>
            <Text style={[styles.caption2, { color: "white" }]}>등록하기</Text>
          </TouchableOpacity>
        )}
        
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    gap: 54,
    backgroundColor:"white",
  },
  upperFrame: {
    width: "100%",
    alignItems: "flex-start", 
    justifyContent: "flex-start", 
    gap: 36,
  },
  lowerFrame: {
    width: "100%",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
  },
  
  logo: {
    width: 214,
    height: 39,
  },

  textGroup: {
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 4,
  },

  textField: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "black",
    paddingVertical: 10,
  
    fontSize: 12,
    color: "#616161",
    paddingHorizontal: 12,
  },

  button1: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width : 328,
    height : 44,
    borderRadius: 8,
    backgroundColor: "#EFEFEF",
  },

  noResultBox: {
    flexDirection: "row",
    alignItems: "center",
  },

  createBox: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    backgroundColor: "#EFEFEF",

    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,

    justifyContent: "flex-start",
  },

  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#FF4D8C",
    backgroundColor: "white",
  },

  head2: {
    fontSize: 20,
    fontWeight: "black",
  },
  caption2: {
    fontSize: 12,
    color: "black",
    fontWeight: "600",
  },
});
