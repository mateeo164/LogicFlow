import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { misNotificaciones, marcarNotifsLeidas, Notificacion } from '../../services/tutor'
import { Colors, Spacing, Typography, Radius, Fonts } from '../../constants/theme'

function fechaRelativa(iso: string) {
  const d = new Date(iso), ahora = new Date()
  const seg = Math.round((ahora.getTime() - d.getTime()) / 1000)
  if (seg < 60) return 'ahora'
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`
  if (seg < 604800) return `hace ${Math.floor(seg / 86400)} d`
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })
}

const ICONO: Record<string, string> = { tarea_nueva: '📝', tarea_calificada: '✅' }

export function NotificacionesScreen() {
  const [notis, setNotis] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const cargar = useCallback(async () => {
    try { setNotis(await misNotificaciones()) } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function marcarTodas() {
    try { await marcarNotifsLeidas(); setNotis(prev => prev.map(n => ({ ...n, leida: true }))) } catch {}
  }

  const noLeidas = notis.filter(n => !n.leida).length

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}><Ionicons name="chevron-back" size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        {noLeidas > 0
          ? <TouchableOpacity onPress={marcarTodas} hitSlop={8}><Text style={styles.marcar}>Marcar leídas</Text></TouchableOpacity>
          : <View style={{ width: 22 }} />}
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar() }} tintColor={Colors.primary} />}
      >
        {notis.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 44 }}>🔔</Text>
            <Text style={styles.emptyTitle}>Sin notificaciones</Text>
            <Text style={styles.emptyText}>Aquí llegarán los avisos de tus tutores: nuevas tareas y calificaciones.</Text>
          </View>
        ) : (
          notis.map(n => (
            <View key={n.id} style={[styles.item, !n.leida && styles.itemNoLeida]}>
              <Text style={styles.ic}>{ICONO[n.tipo] || '🔔'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>{n.titulo}</Text>
                {!!n.cuerpo && <Text style={styles.cuerpo}>{n.cuerpo}</Text>}
                <Text style={styles.fecha}>{fechaRelativa(n.created_at)}</Text>
              </View>
              {!n.leida && <View style={styles.dot} />}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerTitle: { ...Typography.h2 },
  marcar: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.primary },
  scroll: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },

  empty: { alignItems: 'center', gap: Spacing.xs, paddingTop: Spacing.xl },
  emptyTitle: { ...Typography.h2, marginTop: Spacing.sm },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, paddingHorizontal: Spacing.lg },

  item: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.md },
  itemNoLeida: { borderColor: Colors.primaryMid, backgroundColor: Colors.primarySoft },
  ic: { fontSize: 20 },
  titulo: { fontFamily: Fonts.sansBold, fontSize: 14.5, color: Colors.text },
  cuerpo: { ...Typography.caption, marginTop: 2, lineHeight: 18 },
  fecha: { ...Typography.small, marginTop: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 4 },
})
