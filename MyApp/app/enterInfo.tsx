
import * as React from "react";
import { Text, StyleSheet, View, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const sendEventData = async () => {
  const form = new FormData();
  form.append("link", linkValue);

  images.forEach((img, index) => {
    form.append("images", {
      uri: img.uri,
      type: "image/jpeg",
      name: `image_${index}.jpg`
    });
  });

  const response = await fetch("http://localhost:4000/analyze", {
    method: "POST",
    body: form
  });

  const result = await response.json();
  setEventData(JSON.parse(result.event)); // 화면에 뿌리기
};
