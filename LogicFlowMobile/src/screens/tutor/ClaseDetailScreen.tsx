import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Screen, Pill } from '../../components/ui'
import { GradientCard } from '../../components/GradientCard'
import { StatCard } from '../../components/StatCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { InputField } from '../../components/InputField'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'
import {
  Clase, ClaseTarea, RosterEntry,
  obtenerClase, obtenerRoster, eliminarEstudianteDeClase,
  crearTarea, obtenerTareas, eliminarTarea, calcularCumplimiento,
} from '../../services/clases'

type Categoria = 'deber' | 'reto'
type TipoMeta = ClaseTarea['tipo_meta']

const TIPO_META_OPTIONS: { value: TipoMeta; label: string }[] = [
  { value: 'web_nota_minima', label: 'Nota web ≥' },
  { value: 'web_aprobado', label: 'Aprobó ensamble web' },
  { value: 'ar_completo', label: 'Completó ensamble real (AR)' },
]

export function ClaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [clase, setClase] = useState<Clase | null>(null)
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [categoriaActiva, setCategoriaActiva] = useState<Categoria>('deber')
  const [tareas, setTareas] = useState<ClaseTarea[]>([])
  const [loadingTareas, setLoadingTareas] = useState(true)

  const [modalVisible, setModalVisible] = useState(false)
  const [categoria, setCategoria] = useState<Categoria>('deber')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipoMeta, setTipoMeta] = useState<TipoMeta>('web_nota_minima')
  const [metaValor, setMetaValor] = useState('7')
  const [fechaLimite, setFechaLimite] = useState('')
  const [xpBonus, setXpBonus] = useState('')
  const [creando, setCreando] = useState(false)
  const [errorTarea, setErrorTarea] = useState<string | null>(null)

  const cargarClase = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [c, r] = await Promise.all([obtenerClase(id), obtenerRoster(id)])
    if (!c) {
      router.replace('/(tutor)')
      return
    }
    setClase(c)
    setRoster(r)
    setLoading(false)
  }, [id])

  const cargarTareas = useCallback(async () => {
    if (!id) return
    setLoadingTareas(true)
    const t = await obtenerTareas(id, categoriaActiva)
    setTareas(t)
    setLoadingTareas(false)
  }, [id, categoriaActiva])

  useFocusEffect(useCallback(() => { cargarClase() }, [cargarClase]))
  useFocusEffect(useCallback(() => { cargarTareas() }, [cargarTareas]))

  async function handleQuitarEstudiante(entry: RosterEntry) {
    Alert.alert('Quitar estudiante', `¿Quitar a ${entry.perfil?.full_name || 'este estudiante'} de la clase?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar', style: 'destructive', onPress: async () => {
          const ok = await eliminarEstudianteDeClase(entry.matriculaId)
          if (ok) cargarClase()
        },
      },
    ])
  }

  function abrirModalTarea() {
    setCategoria(categoriaActiva)
    setTitulo('')
    setDescripcion('')
    setTipoMeta('web_nota_minima')
    setMetaValor('7')
    setFechaLimite('')
    setXpBonus('')
    setErrorTarea(null)
    setModalVisible(true)
  }

  async function handleCrearTarea() {
    if (!id || !titulo.trim()) return
    if (tipoMeta === 'web_nota_minima' && !metaValor.trim()) {
      setErrorTarea('Ingresa la nota mínima requerida.')
      return
    }
    setCreando(true)
    setErrorTarea(null)
    const tarea = await crearTarea({ claseId: id, categoria, titulo, descripcion, tipoMeta, metaValor, xpBonus, fechaLimite })
    setCreando(false)
    if (tarea) {
      setCategoriaActiva(categoria)
      setModalVisible(false)
      cargarTareas()
    } else {
      setErrorTarea('No se pudo crear la tarea. Intenta de nuevo.')
    }
  }

  async function handleEliminarTarea(tareaId: string) {
    Alert.alert('Eliminar tarea', '¿Eliminar esta tarea?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { const ok = await eliminarTarea(tareaId); if (ok) cargarTareas() } },
    ])
  }

  if (loading || !clase) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
  }

  const aprobados = roster.filter(r => r.progreso?.ensamble_web_aprobado === true).length
  const arCompletos = roster.filter(r => !!r.progreso?.ensamble_real_completado_at).length
  const pctAprobado = roster.length ? Math.round((aprobados / roster.length) * 100) : 0
  const pctAr = roster.length ? Math.round((arCompletos / roster.length) * 100) : 0

  return (
    <Screen>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.claseNombre} numberOfLines={1}>{clase.nombre}</Text>
          <Text style={styles.claseCodigo}>Código: {clase.codigo}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard icon="🧑‍🎓" label="Matriculados" value={roster.length} color={Colors.primary} />
        <StatCard icon="✅" label="Aprobó web" value={`${pctAprobado}%`} color={Colors.success} />
        <StatCard icon="🛠️" label="AR completo" value={`${pctAr}%`} color={Colors.accent} />
      </View>

      <Text style={styles.sectionTitle}>Roster</Text>
      {roster.length === 0 ? (
        <GradientCard tone="sunken" style={{ marginBottom: Spacing.md }}>
          <Text style={styles.emptyText}>Nadie se ha unido todavía. Comparte el código de la clase.</Text>
        </GradientCard>
      ) : (
        roster.map(entry => {
          const nombre = entry.perfil?.full_name || entry.perfil?.email?.split('@')[0] || 'Estudiante'
          const nota = entry.progreso?.ensamble_web_nota
          const aprobado = entry.progreso?.ensamble_web_aprobado === true
          const arInstalados = entry.progreso?.ensamble_real_instalados?.length || 0
          const arCompleto = !!entry.progreso?.ensamble_real_completado_at
          return (
            <View key={entry.matriculaId} style={styles.rosterRow}>
              <View style={styles.rosterAvatar}>
                <Text style={styles.rosterAvatarText}>{nombre.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rosterName} numberOfLines={1}>{nombre}</Text>
                <Text style={styles.rosterMeta}>
                  Nota web: {typeof nota === 'number' ? nota.toFixed(1) : '—'} · AR: {arCompleto ? 'Completo' : `${arInstalados}/8`}
                </Text>
              </View>
              <Pill label={aprobado ? 'Aprobado' : 'No aprobado'} tone={aprobado ? 'success' : 'neutral'} />
              <TouchableOpacity onPress={() => handleQuitarEstudiante(entry)} hitSlop={8} style={{ marginLeft: 6 }}>
                <Ionicons name="close-circle-outline" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          )
        })
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Deberes y retos</Text>
        <TouchableOpacity onPress={abrirModalTarea} style={styles.addBtn}>
          <Ionicons name="add" size={16} color={Colors.textInverse} />
          <Text style={styles.addBtnText}>Nueva tarea</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsRow}>
        <Pressable onPress={() => setCategoriaActiva('deber')} style={[styles.tabBtn, categoriaActiva === 'deber' && styles.tabBtnActive]}>
          <Text style={[styles.tabBtnText, categoriaActiva === 'deber' && styles.tabBtnTextActive]}>Deberes</Text>
        </Pressable>
        <Pressable onPress={() => setCategoriaActiva('reto')} style={[styles.tabBtn, categoriaActiva === 'reto' && styles.tabBtnActive]}>
          <Text style={[styles.tabBtnText, categoriaActiva === 'reto' && styles.tabBtnTextActive]}>Retos</Text>
        </Pressable>
      </View>

      {loadingTareas ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.md }} />
      ) : tareas.length === 0 ? (
        <GradientCard tone="sunken"><Text style={styles.emptyText}>Aún no hay tareas en esta categoría.</Text></GradientCard>
      ) : (
        tareas.map(tarea => {
          const cumplieron = roster.filter(r => calcularCumplimiento(tarea, r.progreso)).length
          const total = roster.length
          const pct = total ? Math.round((cumplieron / total) * 100) : 0
          const metaTexto = tarea.tipo_meta === 'web_nota_minima'
            ? `Nota web ≥ ${Number(tarea.meta_valor).toFixed(1)}`
            : TIPO_META_OPTIONS.find(o => o.value === tarea.tipo_meta)?.label
          return (
            <GradientCard key={tarea.id} style={{ marginBottom: Spacing.sm, gap: 8 }}>
              <View style={styles.tareaTop}>
                <Text style={styles.tareaTitulo} numberOfLines={1}>{tarea.titulo}</Text>
                <TouchableOpacity onPress={() => handleEliminarTarea(tarea.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={17} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              {tarea.descripcion ? <Text style={styles.tareaDesc}>{tarea.descripcion}</Text> : null}
              <View style={styles.tareaMeta}>
                <Pill label={metaTexto || ''} tone="neutral" />
                {tarea.categoria === 'deber' && tarea.fecha_limite && (
                  <Pill label={`📅 ${new Date(tarea.fecha_limite).toLocaleDateString('es-EC')}`} tone="neutral" />
                )}
                {tarea.categoria === 'reto' && tarea.xp_bonus > 0 && (
                  <Pill label={`+${tarea.xp_bonus} XP`} tone="accent" />
                )}
              </View>
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
                <Text style={styles.progressText}>{cumplieron}/{total}</Text>
              </View>
            </GradientCard>
          )
        })
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Nueva tarea</Text>

              <View style={styles.chipRow}>
                <Chip label="Deber" active={categoria === 'deber'} onPress={() => setCategoria('deber')} />
                <Chip label="Reto" active={categoria === 'reto'} onPress={() => setCategoria('reto')} />
              </View>

              <InputField label="Título" value={titulo} onChangeText={setTitulo} placeholder="Ej. Aprobar el ensamble web" icon="clipboard-outline" />
              <InputField label="Descripción (opcional)" value={descripcion} onChangeText={setDescripcion} icon="document-text-outline" />

              <Text style={styles.fieldLabel}>Meta</Text>
              <View style={styles.chipRowWrap}>
                {TIPO_META_OPTIONS.map(opt => (
                  <Chip key={opt.value} label={opt.label} active={tipoMeta === opt.value} onPress={() => setTipoMeta(opt.value)} />
                ))}
              </View>

              {tipoMeta === 'web_nota_minima' && (
                <InputField label="Nota mínima (0-10)" value={metaValor} onChangeText={setMetaValor} keyboardType="decimal-pad" icon="school-outline" />
              )}
              {categoria === 'deber' && (
                <InputField label="Fecha límite (AAAA-MM-DD, opcional)" value={fechaLimite} onChangeText={setFechaLimite} placeholder="2026-07-15" icon="calendar-outline" />
              )}
              {categoria === 'reto' && (
                <InputField label="XP bonus (informativo, opcional)" value={xpBonus} onChangeText={setXpBonus} keyboardType="number-pad" icon="flash-outline" />
              )}

              {errorTarea ? <Text style={styles.errorText}>{errorTarea}</Text> : null}

              <PrimaryButton label="Crear tarea" onPress={handleCrearTarea} loading={creando} style={{ marginTop: Spacing.sm }} />
              <PrimaryButton label="Cancelar" onPress={() => setModalVisible(false)} variant="secondary" style={{ marginTop: Spacing.xs }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt },
  claseNombre: { fontFamily: Fonts.serif, fontSize: 19, color: Colors.text },
  claseCodigo: { ...Typography.caption },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },

  sectionTitle: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.text, marginBottom: Spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },

  rosterRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.sm, marginBottom: 8,
  },
  rosterAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.primaryDeep, alignItems: 'center', justifyContent: 'center' },
  rosterAvatarText: { fontFamily: Fonts.sansBold, fontSize: 14, color: Colors.textInverse },
  rosterName: { fontFamily: Fonts.sansBold, fontSize: 14, color: Colors.text },
  rosterMeta: { ...Typography.small, marginTop: 1 },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryDeep, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7, ...Shadow.sm },
  addBtnText: { fontFamily: Fonts.sansBold, fontSize: 12.5, color: Colors.textInverse },

  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt },
  tabBtnActive: { backgroundColor: Colors.primaryDeep },
  tabBtnText: { fontFamily: Fonts.sansSemi, fontSize: 13.5, color: Colors.textSecondary },
  tabBtnTextActive: { color: Colors.textInverse },

  tareaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  tareaTitulo: { flex: 1, fontFamily: Fonts.sansBold, fontSize: 14.5, color: Colors.text },
  tareaDesc: { ...Typography.caption },
  tareaMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressTrack: { flex: 1, height: 6, backgroundColor: Colors.surfaceSunken, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.success, borderRadius: Radius.full },
  progressText: { ...Typography.small },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.lg, paddingBottom: Spacing.xl, maxHeight: '88%' },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.borderStrong, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { ...Typography.h2, marginBottom: Spacing.md },
  fieldLabel: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.textSecondary, marginBottom: 6, marginTop: 2 },
  errorText: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.error, marginTop: Spacing.xs },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  chipActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primaryMid },
  chipText: { fontFamily: Fonts.sansSemi, fontSize: 12.5, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primaryDeep },
})
