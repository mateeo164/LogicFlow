import { useEffect } from 'react'
import { Stack, router, useSegments } from 'expo-router'
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
  const segments = useSegments()

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
  }, [ready])

  // Guarda de sesión: solo redirige cuando estás del lado equivocado de la
  // frontera de auth. Nunca vuelve a hacer replace de la ruta en la que ya
  // estás; hacerlo reiniciaba el Stack y remontaba la pantalla de login,
  // cerrando el teclado apenas tocabas el campo de correo.
  useEffect(() => {
    if (!ready) return
    const inAuthGroup = segments[0] === 'auth'
    if (session && inAuthGroup) {
      router.replace('/(tabs)')
    } else if (!session && !inAuthGroup) {
      router.replace('/auth/login')
    }
  }, [ready, session, segments])

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
