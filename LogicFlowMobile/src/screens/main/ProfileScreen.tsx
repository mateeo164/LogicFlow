import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../services/auth'
import { unirseAClase, misClasesEstudiante, Clase } from '../../services/tutor'
import { calculateXp, getLevelProgress } from '../../constants/components'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'
import { GradientCard } from '../../components/GradientCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { InputField } from '../../components/InputField'
import { router } from 'expo-router'
import { supabase } from '../../services/supabase'
import { loadSoundPref, setSoundPref, sfx } from '../../services/sound'

async function actualizarPerfilSupabase(params: { full_name?: string; institucion?: string }) {
  const { error } = await supabase.auth.updateUser({ data: params })
  if (error) throw error
}

export function ProfileScreen() {
  const { userName, userEmail, userInstitucion, userRol } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(userName)
  const [institucion, setInstitucion] = useState(userInstitucion)
  const [saving, setSaving] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [soundEffects, setSoundEffects] = useState(true)
  const [codigo, setCodigo] = useState('')
  const [joining, setJoining] = useState(false)
  const [misClases, setMisClases] = useState<Clase[]>([])

  const esTutor = (userRol || 'Estudiante').toLowerCase() === 'tutor'

  useEffect(() => {
    loadSoundPref().then(setSoundEffects)
    if (!esTutor) misClasesEstudiante().then(setMisClases).catch(() => {})
  }, [])

  async function handleJoin() {
    const c = codigo.trim()
    if (!c) return
    setJoining(true)
    try {
      const clase = await unirseAClase(c)
      setCodigo('')
      Alert.alert('¡Listo!', `Te uniste a "${clase?.nombre || 'la clase'}".`)
      setMisClases(await misClasesEstudiante())
    } catch (err: any) {
      Alert.alert('No se pudo unir', err.message || 'Código de clase no válido.')
    } finally {
      setJoining(false)
    }
  }

  function handleSoundToggle(value: boolean) {
    setSoundEffects(value)
    setSoundPref(value)
    if (value) sfx.tap()
  }

  const xp = calculateXp(0, [])
  const { current: level } = getLevelProgress(xp)

  async function handleSave() {
    setSaving(true)
    try {
      await actualizarPerfilSupabase({ full_name: name.trim() || undefined, institucion: institucion.trim() || undefined })
      setEditing(false)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => { await signOut(); router.replace('/auth/login') } },
    ])
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Identity header */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.email}>{userEmail}</Text>
          {esTutor ? (
            <View style={[styles.levelBadge, { backgroundColor: Colors.primaryTint }]}>
              <Ionicons name="school" size={14} color={Colors.primaryDeep} />
              <Text style={[styles.levelText, { color: Colors.primaryDeep }]}>Docente</Text>
            </View>
          ) : (
            <View style={[styles.levelBadge, { backgroundColor: level.color + '18' }]}>
              <Text style={styles.levelIcon}>{level.icon}</Text>
              <Text style={[styles.levelText, { color: level.color }]}>{level.name}</Text>
            </View>
          )}
        </View>

        {/* Unirse a una clase (solo estudiantes) */}
        {!esTutor && (
          <GradientCard style={styles.section}>
            <Text style={[styles.sectionTitle, { marginBottom: Spacing.sm }]}>Mi clase</Text>
            <Text style={[styles.muted, { marginBottom: Spacing.sm }]}>
              ¿Tu tutor te compartió un código? Únete a su clase.
            </Text>
            <View style={styles.joinRow}>
              <TextInput
                value={codigo}
                onChangeText={t => setCodigo(t.toUpperCase())}
                placeholder="Código (ej. ABC123)"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                maxLength={8}
                style={styles.joinInput}
              />
              <TouchableOpacity style={[styles.joinBtn, joining && { opacity: 0.6 }]} onPress={handleJoin} disabled={joining}>
                {joining ? <ActivityIndicator color={Colors.textInverse} size="small" /> : <Text style={styles.joinBtnTxt}>Unirme</Text>}
              </TouchableOpacity>
            </View>
            {misClases.map(c => (
              <View key={c.id} style={styles.miClaseRow}>
                <Ionicons name="people-outline" size={16} color={Colors.primary} />
                <Text style={styles.miClaseName}>{c.nombre}</Text>
                <Text style={styles.miClaseCode}>{c.codigo}</Text>
              </View>
            ))}
          </GradientCard>
        )}

        {/* Account info */}
        <GradientCard style={styles.section}>
          <Row label="Rol" value={userRol} icon="ribbon-outline" />
          {userInstitucion ? (
            <Row label="Institución" value={userInstitucion} icon="school-outline" last />
          ) : null}
        </GradientCard>

        {/* Edit profile */}
        <GradientCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Editar perfil</Text>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8}>
                <Text style={styles.editLink}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>
          {editing ? (
            <View style={{ gap: Spacing.md }}>
              <InputField label="Nombre completo" value={name} onChangeText={setName} icon="person-outline" />
              <InputField label="Institución" value={institucion} onChangeText={setInstitucion} placeholder="Opcional" icon="school-outline" />
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <PrimaryButton label="Guardar" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.muted}>Toca "Editar" para actualizar tu nombre e institución.</Text>
          )}
        </GradientCard>

        {/* Preferences */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: Spacing.sm }]}>Preferencias</Text>
          <PrefRow
            title="Notificaciones" sub="Recordatorios de práctica diaria"
            value={notifications} onValueChange={setNotifications}
          />
          <View style={styles.prefDivider} />
          <PrefRow
            title="Efectos de sonido" sub="Feedback auditivo en el ensamblaje"
            value={soundEffects} onValueChange={handleSoundToggle}
          />
        </GradientCard>

        {/* About */}
        <GradientCard tone="navy" style={styles.section}>
          <Text style={styles.aboutTitle}>Acerca de LogicFlow</Text>
          <Text style={styles.aboutText}>
            Un ecosistema de aprendizaje para hardware de computadoras. Aprende ensamblando: desde la teoría
            hasta la práctica con simulaciones y realidad aumentada.
          </Text>
          <View style={styles.aboutMeta}>
            <Text style={styles.aboutMetaItem}>v1.0.0 MVP</Text>
            <Text style={styles.aboutDot}>·</Text>
            <Text style={styles.aboutMetaItem}>React Native + Expo</Text>
          </View>
        </GradientCard>

        <PrimaryButton label="Cerrar sesión" icon="⏻" onPress={handleSignOut} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value, icon, last }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name']; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={17} color={Colors.textMuted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function PrefRow({ title, sub, value, onValueChange }: { title: string; sub: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.prefRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.prefTitle}>{title}</Text>
        <Text style={styles.prefSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.borderStrong, true: Colors.primaryMid }}
        thumbColor={Colors.surface}
        ios_backgroundColor={Colors.borderStrong}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 120 },

  identity: { alignItems: 'center', marginBottom: Spacing.lg, gap: 6 },
  avatar: { width: 84, height: 84, borderRadius: 28, backgroundColor: Colors.primaryDeep, justifyContent: 'center', alignItems: 'center', marginBottom: 4, ...Shadow.md },
  avatarText: { fontFamily: Fonts.serif, fontSize: 34, color: Colors.textInverse },
  name: { ...Typography.h1 },
  email: { ...Typography.caption },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, marginTop: 6 },
  levelIcon: { fontSize: 14 },
  levelText: { fontFamily: Fonts.sansBold, fontSize: 13 },

  section: { marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.text },
  editLink: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.primary },
  muted: { ...Typography.caption },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { ...Typography.caption },
  infoValue: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.text },

  cancelBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surfaceSunken, borderRadius: Radius.md },
  cancelText: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.textSecondary },

  joinRow: { flexDirection: 'row', gap: Spacing.sm },
  joinInput: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 11,
    fontFamily: Fonts.sansSemi, fontSize: 15, letterSpacing: 2, color: Colors.text,
  },
  joinBtn: { paddingHorizontal: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.primaryDeep, alignItems: 'center', justifyContent: 'center' },
  joinBtnTxt: { fontFamily: Fonts.sansBold, fontSize: 14, color: Colors.textInverse },
  miClaseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: Spacing.sm },
  miClaseName: { flex: 1, fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.text },
  miClaseCode: { fontFamily: Fonts.sansBold, fontSize: 12, color: Colors.primary, letterSpacing: 1 },

  prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  prefDivider: { height: 1, backgroundColor: Colors.border },
  prefTitle: { fontFamily: Fonts.sansSemi, fontSize: 14.5, color: Colors.text },
  prefSub: { ...Typography.small, marginTop: 2 },

  aboutTitle: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.primaryDeep, marginBottom: 6 },
  aboutText: { fontFamily: Fonts.sans, fontSize: 13.5, color: Colors.primary, lineHeight: 21 },
  aboutMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md },
  aboutMetaItem: { fontFamily: Fonts.sansSemi, fontSize: 12, color: Colors.primaryMid },
  aboutDot: { color: Colors.primaryMid },
})
