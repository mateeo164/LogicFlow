import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { misTareas, entregarTarea, MiTarea } from '../../services/tutor'
import { Colors, Spacing, Typography, Radius, Fonts } from '../../constants/theme'

function fmtFecha(iso: string | null) {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }) } catch { return null }
}

export function MisTareasScreen() {
  const [tareas, setTareas] = useState<MiTarea[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [enviando, setEnviando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try { setTareas(await misTareas()) } catch (err: any) { Alert.alert('Error', err.message) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function entregar(id: string) {
    setEnviando(id)
    try { await entregarTarea(id); await cargar() }
    catch (err: any) { Alert.alert('Error', err.message) }
    finally { setEnviando(null) }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}><Ionicons name="chevron-back" size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Mis tareas</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar() }} tintColor={Colors.primary} />}
      >
        {tareas.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 44 }}>📋</Text>
            <Text style={styles.emptyTitle}>Sin tareas por ahora</Text>
            <Text style={styles.emptyText}>Cuando tu tutor asigne tareas, aparecerán aquí. Únete a una clase desde tu perfil.</Text>
          </View>
        ) : (
          tareas.map(t => {
            const vence = fmtFecha(t.vence_at)
            const estado = t.calificada
              ? { txt: `Calificada: ${Number(t.nota).toFixed(1)}/${Number(t.puntaje_max).toFixed(0)}`, style: styles.estCalificada }
              : t.entregada
                ? { txt: 'Entregada · por calificar', style: styles.estEntregada }
                : { txt: 'Pendiente', style: styles.estPendiente }
            return (
              <View key={t.tarea_id} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.titulo}>{t.titulo}</Text>
                    <Text style={styles.clase}>{t.clase_nombre}{vence ? ` · vence ${vence}` : ''}</Text>
                  </View>
                  <View style={[styles.estado, estado.style]}>
                    <Text style={styles.estadoTxt}>{estado.txt}</Text>
                  </View>
                </View>
                {!!t.descripcion && <Text style={styles.desc}>{t.descripcion}</Text>}
                {!!t.comentario && (
                  <View style={styles.coment}><Text style={styles.comentTxt}>💬 {t.comentario}</Text></View>
                )}
                {!t.entregada && (
                  <TouchableOpacity style={styles.entregarBtn} onPress={() => entregar(t.tarea_id)} disabled={enviando === t.tarea_id}>
                    {enviando === t.tarea_id
                      ? <ActivityIndicator color={Colors.textInverse} size="small" />
                      : <Text style={styles.entregarTxt}>Marcar como entregada</Text>}
                  </TouchableOpacity>
                )}
              </View>
            )
          })
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
  scroll: { padding: Spacing.md, paddingBottom: 120 },

  empty: { alignItems: 'center', gap: Spacing.xs, paddingTop: Spacing.xl },
  emptyTitle: { ...Typography.h2, marginTop: Spacing.sm },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, paddingHorizontal: Spacing.lg },

  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  titulo: { fontFamily: Fonts.sansBold, fontSize: 15, color: Colors.text },
  clase: { ...Typography.small, marginTop: 2 },
  estado: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  estadoTxt: { fontFamily: Fonts.sansBold, fontSize: 11 },
  estPendiente: { backgroundColor: Colors.surfaceSunken },
  estEntregada: { backgroundColor: Colors.primarySoft },
  estCalificada: { backgroundColor: Colors.successSoft },
  desc: { ...Typography.caption, marginTop: Spacing.sm, lineHeight: 19 },
  coment: { marginTop: Spacing.sm, backgroundColor: Colors.surfaceSunken, borderRadius: Radius.sm, padding: Spacing.sm },
  comentTxt: { fontFamily: Fonts.sans, fontSize: 13, color: Colors.text, lineHeight: 19 },
  entregarBtn: { marginTop: Spacing.md, backgroundColor: Colors.primaryDeep, borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center' },
  entregarTxt: { fontFamily: Fonts.sansBold, fontSize: 14, color: Colors.textInverse },
})
