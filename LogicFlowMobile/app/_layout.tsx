import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet, View } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
} from '@expo-google-fonts/playfair-display'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import { useAuth } from '../src/hooks/useAuth'
import { Colors } from '../src/constants/theme'
import { loadSoundPref } from '../src/services/sound'

SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  const { session, loading } = useAuth()

  useEffect(() => {
    loadSoundPref()
  }, [])
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  const ready = (fontsLoaded || !!fontError) && !loading

  useEffect(() => {
    if (!ready) return
    SplashScreen.hideAsync().catch(() => {})
    if (!session) router.replace('/auth/login')
    else router.replace('/(tabs)')
  }, [ready, session])

  if (!ready) {
    return <View style={styles.boot} />
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="certificate" options={{ presentation: 'card' }} />
        <Stack.Screen name="tareas" options={{ presentation: 'card' }} />
        <Stack.Screen name="notificaciones" options={{ presentation: 'card' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  boot: { flex: 1, backgroundColor: Colors.background },
})
