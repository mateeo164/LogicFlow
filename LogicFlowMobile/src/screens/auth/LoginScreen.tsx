import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { signIn } from '../../services/auth'
import { InputField } from '../../components/InputField'
import { PrimaryButton } from '../../components/PrimaryButton'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  function validate() {
    const e: typeof errors = {}
    if (!email.trim()) e.email = 'Ingresa tu correo'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Correo inválido'
    if (!password) e.password = 'Ingresa tu contraseña'
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleLogin() {
    if (!validate()) return
    setLoading(true)
    try {
      await signIn(email.trim().toLowerCase(), password)
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Brand */}
          <View style={styles.hero}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>L</Text>
            </View>
            <Text style={styles.logo}>
              Logic<Text style={styles.logoAccent}>Flow</Text>
            </Text>
            <Text style={styles.tagline}>Aprende ensamblando</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Iniciar sesión</Text>
            <Text style={styles.subtitle}>Bienvenido de vuelta a tu laboratorio.</Text>

            <View style={{ gap: Spacing.md, marginTop: Spacing.sm }}>
              <InputField
                label="Correo electrónico" value={email} onChangeText={setEmail}
                keyboardType="email-address" icon="mail-outline"
                placeholder="tu@correo.com" error={errors.email}
              />
              <InputField
                label="Contraseña" value={password} onChangeText={setPassword}
                isPassword icon="lock-closed-outline" placeholder="••••••••" error={errors.password}
              />

              <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} hitSlop={6}>
                <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              <PrimaryButton label="Entrar al laboratorio" onPress={handleLogin} loading={loading} />
            </View>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>o</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/auth/register')}>
              <Text style={styles.secondaryText}>
                ¿No tienes cuenta? <Text style={styles.secondaryLink}>Regístrate</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  hero: { alignItems: 'center', marginBottom: Spacing.xl, gap: 6 },
  logoMark: { width: 60, height: 60, borderRadius: 20, backgroundColor: Colors.primaryDeep, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm, ...Shadow.md },
  logoMarkText: { fontFamily: Fonts.serifBlack, fontSize: 32, color: Colors.textInverse },
  logo: { fontFamily: Fonts.serif, fontSize: 32, color: Colors.text, letterSpacing: -0.5 },
  logoAccent: { color: Colors.accent },
  tagline: { ...Typography.caption },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  title: { ...Typography.h1 },
  subtitle: { ...Typography.caption, marginTop: 4 },
  forgot: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.primary, textAlign: 'right' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.md },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { ...Typography.small },
  secondaryBtn: { alignItems: 'center' },
  secondaryText: { fontFamily: Fonts.sans, fontSize: 14, color: Colors.textSecondary },
  secondaryLink: { fontFamily: Fonts.sansBold, color: Colors.accent },
})
