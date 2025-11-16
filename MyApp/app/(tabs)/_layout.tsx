// app/(tabs)/_layout.tsx

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // 탭 바의 기본 배경색과 모양을 설정합니다.
        tabBarStyle: styles.bottomNav,
        // 각 스크린 헤더를 숨깁니다 (이미 home.tsx에서 처리했지만 명시적으로 설정)
        headerShown: false, 
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'HOME',
          tabBarIcon: ({ focused }) => (
            <View style={styles.navItem}>
              <Ionicons 
                name="home" 
                size={24} 
                // 포커스 상태에 따라 색상 변경
                color={focused ? '#FF59AD' : '#616161'} 
              />
              <Text style={focused ? styles.navTextActive : styles.navTextInactive}>HOME</Text>
            </View>
          ),
          // 탭 바 레이블을 숨기고 아이콘 컴포넌트 내부에서 텍스트를 처리합니다.
          tabBarShowLabel: false, 
        }}
      />
      
      <Tabs.Screen
        name="mypage"
        options={{
          title: 'MYPAGE',
          tabBarIcon: ({ focused }) => (
            <View style={styles.navItem}>
              <Ionicons 
                name="person-outline" 
                size={24} 
                color={focused ? '#FF59AD' : '#616161'} 
              />
              <Text style={focused ? styles.navTextActive : styles.navTextInactive}>MYPAGE</Text>
            </View>
          ),
          tabBarShowLabel: false, 
        }}
      />
    </Tabs>
  );
}

// ------------------- 스타일 시트 -------------------
const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row', 
    backgroundColor: '#000', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    height: 70,
  },
  navItem: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingTop: 30
  },
  navTextActive: { 
    color: '#FF59AD', 
    fontSize: 8, 
    fontWeight: '600', 
    marginTop: 2 
  },
  navTextInactive: { 
    color: '#616161', 
    fontSize: 8, 
    fontWeight: '600', 
    marginTop: 2 
  },
});