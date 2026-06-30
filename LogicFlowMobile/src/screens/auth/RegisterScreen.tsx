import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { signUp } from '../../services/auth'
import { InputField } from '../../components/InputField'
import { PrimaryButton } from '../../components/PrimaryButton'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'

export function RegisterScreen() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', institucion: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(field: keyof typeof form) {
    return (value: string) => setForm(prev => ({ ...prev, [field]: value }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.fullName.trim()) e.fullName = 'Ingresa tu nombre'
    if (!form.email.trim()) e.email = 'Ingresa tu correo'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Correo inválido'
    if (!form.password) e.password = 'Ingresa una contraseña'
    else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirm) e.confirm = 'Las contraseñas no coinciden'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleRegister() {
    if (!validate()) return
    setLoading(true)
    try {
      await signUp(form.email.trim().toLowerCase(), form.password, form.fullName.trim(), form.institucion.trim() || undefined)
      Alert.alert('¡Cuenta creada!', 'Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.', [
        { text: 'Ir al login', onPress: () => router.replace('/auth/login') },
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={Typography.overline}>NUEVO INGRESO</Text>
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>Únete al laboratorio de aprendizaje de hardware.</Text>
          </View>

          <View style={styles.card}>
            <InputField label="Nombre completo" value={form.fullName} onChangeText={set('fullName')} icon="person-outline" placeholder="Tu nombre" error={errors.fullName} />
            <InputField label="Correo electrónico" value={form.email} onChangeText={set('email')} icon="mail-outline" keyboardType="email-address" placeholder="tu@correo.com" error={errors.email} />
            <InputField label="Institución (opcional)" value={form.institucion} onChangeText={set('institucion')} icon="school-outline" placeholder="Universidad / Colegio" />
            <InputField label="Contraseña" value={form.password} onChangeText={set('password')} isPassword icon="lock-closed-outline" placeholder="Mínimo 8 caracteres" error={errors.password} />
            <InputField label="Confirmar contraseña" value={form.confirm} onChangeText={set('confirm')} isPassword icon="lock-closed-outline" placeholder="Repite tu contraseña" error={errors.confirm} />

            <PrimaryButton label="Crear mi cuenta" onPress={handleRegister} loading={loading} style={{ marginTop: Spacing.xs }} />

            <View style={styles.terms}>
              <Ionicons name="shield-checkmark-outline" size={15} color={Colors.textMuted} />
              <Text style={styles.termsText}>Al registrarte aceptas usar LogicFlow únicamente con fines educativos.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: Spacing.lg },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.md, alignSelf: 'flex-start' },
  backText: { fontFamily: Fonts.sansSemi, fontSize: 15, color: Colors.primary },
  header: { marginBottom: Spacing.lg, gap: 4 },
  title: { ...Typography.display },
  subtitle: { ...Typography.caption, marginTop: 2 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.lg,
  },
  terms: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm },
  termsText: { flex: 1, fontFamily: Fonts.sans, fontSize: 11.5, color: Colors.textMuted, lineHeight: 16 },
})
