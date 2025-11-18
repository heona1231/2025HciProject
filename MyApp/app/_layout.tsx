// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* 1순위: getname을 앱의 첫 화면(Entry Point)으로 명확히 정의 */}
      <Stack.Screen name="getname" options={{ title: "Get Name", headerShown: false }} />

      {/* 2순위: 온보딩 화면 */}
      <Stack.Screen name="onboarding" options={{ title: "Onboarding", headerShown: false }} />
      
      {/* 3순위: 탭 화면 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* 다른 라우트가 있다면 이 아래에 정의 */}
    </Stack>
  );
}