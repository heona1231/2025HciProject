// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* 첫 화면(index) */}
      <Stack.Screen name="index" options={{ title: "Welcome", headerShown: false }} />

      {/* 온보딩 */}
      <Stack.Screen name="onboarding" options={{ title: "Onboarding", headerShown: false }} />

      {/* 탭 네비게이션 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
