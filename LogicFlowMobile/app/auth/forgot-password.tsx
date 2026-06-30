import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { resetPassword } from '../../src/services/auth'
import { InputField } from '../../src/components/InputField'
import { PrimaryButton } from '../../src/components/PrimaryButton'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../src/constants/theme'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleReset() {
    if (!email.trim()) return
    setLoading(true)
    try {
      await resetPassword(email.trim().toLowerCase())
      setSent(true)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        {sent ? (
          <View style={styles.card}>
            <View style={styles.successIcon}>
              <Ionicons name="mail-open-outline" size={40} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>¡Correo enviado!</Text>
            <Text style={styles.successText}>
              Si el correo está registrado, recibirás un enlace en tu bandeja de entrada o spam.
            </Text>
            <PrimaryButton label="Volver al login" onPress={() => router.replace('/auth/login')} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={Typography.overline}>RECUPERACIÓN</Text>
              <Text style={Typography.display}>Recuperar contraseña</Text>
              <Text style={styles.subtitle}>Te enviaremos un enlace para restablecer tu contraseña.</Text>
            </View>
            <View style={styles.card}>
              <InputField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" icon="mail-outline" placeholder="tu@correo.com" />
              <PrimaryButton label="Enviar enlace" onPress={handleReset} loading={loading} />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
  back: { position: 'absolute', top: Spacing.lg, left: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontFamily: Fonts.sansSemi, fontSize: 15, color: Colors.primary },
  header: { marginBottom: Spacing.lg, gap: 4 },
  subtitle: { ...Typography.caption, marginTop: 4 },
  card: {
    gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', ...Shadow.lg,
  },
  successIcon: { width: 84, height: 84, borderRadius: 28, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  successTitle: { ...Typography.h2, textAlign: 'center' },
  successText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
})
