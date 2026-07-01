import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { View, StyleSheet, Platform } from 'react-native'
import { Colors, Fonts, Shadow } from '../../src/constants/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({ name, color, focused }: { name: IoniconsName; color: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      {focused && <View style={styles.activePill} />}
      <Ionicons name={name} size={22} color={color} />
    </View>
  )
}

export default function TutorTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, Shadow.lg],
        tabBarActiveTintColor: Colors.primaryDeep,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: { paddingTop: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Clases',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clase/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    height: Platform.OS === 'ios' ? 86 : 70,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 6,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  label: { fontFamily: Fonts.sansSemi, fontSize: 10.5, marginTop: 2 },
  iconWrap: { width: 48, alignItems: 'center', justifyContent: 'center', height: 30 },
  activePill: {
    position: 'absolute',
    width: 44,
    height: 30,
    borderRadius: 12,
    backgroundColor: Colors.primaryTint,
  },
})
