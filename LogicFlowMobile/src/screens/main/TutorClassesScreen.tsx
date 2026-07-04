import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  crearClase, misClasesTutor, resumenClase, Clase, ResumenEstudiante,
  crearTarea, tareasDeClase, resumenTarea, calificarEntrega, Tarea, EntregaResumen,
} from '../../services/tutor'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'
import { GradientCard } from '../../components/GradientCard'

function formatTiempo(seg: number) {
  if (!seg || seg < 60) return `${seg || 0}s`
  if (seg < 3600) return `${Math.round(seg / 60)} min`
  const h = Math.floor(seg / 3600)
  const m = Math.round((seg % 3600) / 60)
  return m ? `${h}h ${m}m` : `${h}h`
}

function iniciales(n: string) {
  if (!n) return '?'
  const p = n.trim().split(/\s+/)
  return (p.length === 1 ? p[0][0] : p[0][0] + p[p.length - 1][0]).toUpperCase()
}

export function TutorClassesScreen() {
  const [clases, setClases] = useState<Clase[]>([])
  const [selected, setSelected] = useState<Clase | null>(null)
  const [alumnos, setAlumnos] = useState<ResumenEstudiante[]>([])
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<'estudiantes' | 'tareas'>('estudiantes')

  const cargarClases = useCallback(async (keepSelection = false) => {
    try {
      const cs = await misClasesTutor()
      setClases(cs)
      if (!keepSelection && cs.length && !selected) selectClase(cs[0])
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selected])

  useEffect(() => { cargarClases() }, [])

  async function selectClase(c: Clase) {
    setSelected(c)
    setLoadingAlumnos(true)
    try {
      setAlumnos(await resumenClase(c.id))
    } catch (err: any) {
      Alert.alert('Error', err.message)
      setAlumnos([])
    } finally {
      setLoadingAlumnos(false)
    }
  }

  async function handleCrear() {
    const n = nombre.trim()
    if (!n) return
    setCreating(true)
    try {
      const nueva = await crearClase(n)
      setNombre('')
      await cargarClases(true)
      if (nueva) selectClase(nueva)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setCreating(false)
    }
  }

  function compartirCodigo(c: Clase) {
    Share.share({
      message: `Únete a mi clase "${c.nombre}" en LogicFlow con el código: ${c.codigo}`,
    }).catch(() => {})
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargarClases(true) }} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={Typography.overline}>DOCENTE</Text>
          <Text style={Typography.h1}>Mis clases</Text>
        </View>

        {/* Crear clase */}
        <GradientCard style={styles.createCard}>
          <Text style={styles.createLabel}>Crear una clase</Text>
          <View style={styles.createRow}>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre (ej. 6to A · Hardware)"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              maxLength={60}
            />
            <TouchableOpacity style={[styles.createBtn, creating && { opacity: 0.6 }]} onPress={handleCrear} disabled={creating}>
              {creating ? <ActivityIndicator color={Colors.textInverse} size="small" /> : <Ionicons name="add" size={22} color={Colors.textInverse} />}
            </TouchableOpacity>
          </View>
        </GradientCard>

        {clases.length === 0 ? (
          <GradientCard tone="navy" style={{ alignItems: 'center', marginTop: Spacing.md }}>
            <Text style={{ fontSize: 40 }}>🏫</Text>
            <Text style={styles.emptyTitle}>Aún no tienes clases</Text>
            <Text style={styles.emptyText}>Crea una clase y comparte su código con tus estudiantes.</Text>
          </GradientCard>
        ) : (
          <>
            {/* Selector de clases */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: Spacing.md }} contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.md }}>
              {clases.map(c => {
                const active = selected?.id === c.id
                return (
                  <TouchableOpacity key={c.id} onPress={() => selectClase(c)} style={[styles.classChip, active && styles.classChipActive]}>
                    <Text style={[styles.classChipName, active && { color: Colors.textInverse }]}>{c.nombre}</Text>
                    <Text style={[styles.classChipMeta, active && { color: 'rgba(255,255,255,0.8)' }]}>{c.estudiantes ?? 0} alumno{(c.estudiantes ?? 0) === 1 ? '' : 's'}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {/* Código de la clase seleccionada */}
            {selected && (
              <TouchableOpacity style={styles.codeCard} onPress={() => compartirCodigo(selected)} activeOpacity={0.85}>
                <View>
                  <Text style={styles.codeLabel}>Código para compartir</Text>
                  <Text style={styles.codeValue}>{selected.codigo}</Text>
                </View>
                <View style={styles.shareBtn}>
                  <Ionicons name="share-social-outline" size={18} color={Colors.primaryDeep} />
                  <Text style={styles.shareTxt}>Compartir</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Segmented control */}
            <View style={styles.segment}>
              {(['estudiantes', 'tareas'] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.segmentBtn, tab === t && styles.segmentBtnActive]} onPress={() => setTab(t)}>
                  <Text style={[styles.segmentTxt, tab === t && styles.segmentTxtActive]}>{t === 'estudiantes' ? 'Calificaciones' : 'Tareas'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === 'tareas' ? (
              selected && <TutorTareas claseId={selected.id} />
            ) : (
            <>
            {/* Estudiantes */}
            <Text style={styles.sectionTitle}>Estudiantes</Text>
            {loadingAlumnos ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />
            ) : alumnos.length === 0 ? (
              <Text style={styles.noAlumnos}>Sin estudiantes aún. Comparte el código para que se unan.</Text>
            ) : (
              alumnos.map(a => (
                <View key={a.estudiante_id} style={styles.alumnoCard}>
                  <View style={styles.alumnoHead}>
                    <View style={styles.ava}><Text style={styles.avaTxt}>{iniciales(a.nombre)}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alumnoName}>{a.nombre}</Text>
                      <Text style={styles.alumnoEmail}>{a.email}</Text>
                    </View>
                    <View style={styles.notaBadge}>
                      <Text style={[styles.notaTxt, { color: a.nota_web == null ? Colors.textMuted : (Number(a.nota_web) >= 7 ? Colors.success : Colors.error) }]}>
                        {a.nota_web != null ? `${Number(a.nota_web).toFixed(1)}` : '—'}
                      </Text>
                      <Text style={styles.notaSub}>ensamble</Text>
                    </View>
                  </View>
                  <View style={styles.alumnoStats}>
                    <Stat label="Mejor reto" value={a.mejor_nota_reto != null ? `${Number(a.mejor_nota_reto).toFixed(1)}` : '—'} />
                    <Stat label="Retos" value={`${a.retos_superados}`} />
                    <Stat label="Logros" value={`${a.logros_total}`} />
                    <Stat label="Tiempo" value={formatTiempo(a.tiempo_total_segundos)} />
                  </View>
                  <View style={styles.certRow}>
                    <View style={[styles.certMini, a.web_aprobado && styles.certMiniOn]}>
                      <Text style={[styles.certMiniTxt, a.web_aprobado && { color: Colors.success }]}>Web {a.web_aprobado ? '✓' : '·'}</Text>
                    </View>
                    <View style={[styles.certMini, a.movil_completado && styles.certMiniOn]}>
                      <Text style={[styles.certMiniTxt, a.movil_completado && { color: Colors.success }]}>App {a.movil_completado ? '✓' : '·'}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
            </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// -------- Tareas del tutor --------
function TutorTareas({ claseId }: { claseId: string }) {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [titulo, setTitulo] = useState('')
  const [puntaje, setPuntaje] = useState('10')
  const [creating, setCreating] = useState(false)
  const [expandida, setExpandida] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try { setTareas(await tareasDeClase(claseId)) } catch (err: any) { Alert.alert('Error', err.message) }
    finally { setLoading(false) }
  }, [claseId])

  useEffect(() => { cargar() }, [cargar])

  async function crear() {
    const t = titulo.trim()
    if (!t) return
    setCreating(true)
    try {
      await crearTarea({ claseId, titulo: t, puntajeMax: Number(puntaje) || 10 })
      setTitulo(''); setPuntaje('10')
      await cargar()
    } catch (err: any) { Alert.alert('Error', err.message) }
    finally { setCreating(false) }
  }

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />

  return (
    <View>
      <View style={styles.tareaCreate}>
        <TextInput value={titulo} onChangeText={setTitulo} placeholder="Título de la tarea" placeholderTextColor={Colors.textMuted} style={[styles.input, { marginBottom: Spacing.sm }]} maxLength={80} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TextInput value={puntaje} onChangeText={setPuntaje} placeholder="Pts" keyboardType="numeric" placeholderTextColor={Colors.textMuted} style={[styles.input, { width: 70 }]} maxLength={3} />
          <TouchableOpacity style={[styles.createBtnWide, creating && { opacity: 0.6 }]} onPress={crear} disabled={creating}>
            {creating ? <ActivityIndicator color={Colors.textInverse} size="small" /> : <Text style={styles.createBtnTxt}>Crear tarea</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {tareas.length === 0 ? (
        <Text style={styles.noAlumnos}>Sin tareas aún. Crea una arriba.</Text>
      ) : (
        tareas.map(t => (
          <View key={t.id} style={styles.tareaCard}>
            <TouchableOpacity style={styles.tareaHead} onPress={() => setExpandida(expandida === t.id ? null : t.id)} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tareaTitulo}>{t.titulo}</Text>
                <Text style={styles.tareaMeta}>{t.puntaje_max} pts</Text>
              </View>
              <Ionicons name={expandida === t.id ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            {expandida === t.id && <TareaEntregas tareaId={t.id} />}
          </View>
        ))
      )}
    </View>
  )
}

function TareaEntregas({ tareaId }: { tareaId: string }) {
  const [rows, setRows] = useState<EntregaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await resumenTarea(tareaId)
        setRows(r)
        setNotas(Object.fromEntries(r.map(x => [x.estudiante_id, x.nota != null ? String(x.nota) : ''])))
      } catch (err: any) { Alert.alert('Error', err.message) }
      finally { setLoading(false) }
    })()
  }, [tareaId])

  async function guardar(estudianteId: string) {
    setSavingId(estudianteId)
    try {
      const raw = notas[estudianteId]
      await calificarEntrega({ tareaId, estudianteId, nota: raw === '' || raw == null ? null : Number(raw) })
      setRows(prev => prev.map(r => r.estudiante_id === estudianteId ? { ...r, nota: raw === '' ? null : Number(raw), calificada: true } : r))
    } catch (err: any) { Alert.alert('Error', err.message) }
    finally { setSavingId(null) }
  }

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.sm }} />
  if (rows.length === 0) return <Text style={styles.noAlumnos}>Sin estudiantes en la clase.</Text>

  return (
    <View style={styles.entregasWrap}>
      {rows.map(r => (
        <View key={r.estudiante_id} style={styles.entregaRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.entregaNombre}>{r.nombre}</Text>
            <Text style={[styles.entregaEstado, r.entregada && { color: Colors.success }]}>{r.entregada ? '✓ Entregada' : 'Pendiente'}</Text>
          </View>
          <TextInput
            value={notas[r.estudiante_id] ?? ''}
            onChangeText={v => setNotas(prev => ({ ...prev, [r.estudiante_id]: v }))}
            placeholder="Nota" keyboardType="numeric" placeholderTextColor={Colors.textMuted}
            style={styles.entregaNota}
          />
          <TouchableOpacity style={styles.entregaSave} onPress={() => guardar(r.estudiante_id)} disabled={savingId === r.estudiante_id}>
            {savingId === r.estudiante_id
              ? <ActivityIndicator color={Colors.textInverse} size="small" />
              : <Ionicons name="checkmark" size={18} color={Colors.textInverse} />}
          </TouchableOpacity>
        </View>
      ))}
    </View>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 120 },
  header: { marginBottom: Spacing.md, gap: 2 },

  createCard: { gap: Spacing.sm },
  createLabel: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.text },
  createRow: { flexDirection: 'row', gap: Spacing.sm },
  input: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 11,
    fontFamily: Fonts.sans, fontSize: 14, color: Colors.text,
  },
  createBtn: { width: 48, borderRadius: Radius.md, backgroundColor: Colors.primaryDeep, alignItems: 'center', justifyContent: 'center' },

  emptyTitle: { ...Typography.h2, textAlign: 'center', marginTop: Spacing.sm },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },

  classChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minWidth: 130 },
  classChipActive: { backgroundColor: Colors.primaryDeep, borderColor: Colors.primaryDeep },
  classChipName: { fontFamily: Fonts.sansBold, fontSize: 14, color: Colors.text },
  classChipMeta: { ...Typography.small, marginTop: 2 },

  codeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.accentSoft, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg },
  codeLabel: { fontFamily: Fonts.sansSemi, fontSize: 12, color: Colors.accentDeep },
  codeValue: { fontFamily: Fonts.serif, fontSize: 26, letterSpacing: 3, color: Colors.accentDeep, marginTop: 2 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 9 },
  shareTxt: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.primaryDeep },

  sectionTitle: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.text, marginBottom: Spacing.sm },
  noAlumnos: { ...Typography.caption, marginTop: Spacing.sm },

  alumnoCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm },
  alumnoHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ava: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.primaryDeep, alignItems: 'center', justifyContent: 'center' },
  avaTxt: { fontFamily: Fonts.sansBold, fontSize: 14, color: Colors.textInverse },
  alumnoName: { fontFamily: Fonts.sansBold, fontSize: 14.5, color: Colors.text },
  alumnoEmail: { ...Typography.small },
  notaBadge: { alignItems: 'center' },
  notaTxt: { fontFamily: Fonts.serif, fontSize: 20 },
  notaSub: { ...Typography.small },

  alumnoStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: Fonts.sansBold, fontSize: 15, color: Colors.text },
  statLabel: { ...Typography.small, marginTop: 1 },

  certRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  certMini: { backgroundColor: Colors.surfaceSunken, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  certMiniOn: { backgroundColor: Colors.successSoft },
  certMiniTxt: { fontFamily: Fonts.sansSemi, fontSize: 11.5, color: Colors.textMuted },

  segment: { flexDirection: 'row', backgroundColor: Colors.surfaceSunken, borderRadius: Radius.md, padding: 3, marginBottom: Spacing.md },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: Colors.surface, ...Shadow.sm },
  segmentTxt: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.textMuted },
  segmentTxtActive: { color: Colors.primaryDeep },

  tareaCreate: { marginBottom: Spacing.md },
  createBtnWide: { flex: 1, borderRadius: Radius.md, backgroundColor: Colors.primaryDeep, alignItems: 'center', justifyContent: 'center', paddingVertical: 11 },
  createBtnTxt: { fontFamily: Fonts.sansBold, fontSize: 14, color: Colors.textInverse },

  tareaCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  tareaHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tareaTitulo: { fontFamily: Fonts.sansBold, fontSize: 14.5, color: Colors.text },
  tareaMeta: { ...Typography.small, marginTop: 1 },

  entregasWrap: { marginTop: Spacing.sm, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  entregaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  entregaNombre: { fontFamily: Fonts.sansSemi, fontSize: 13.5, color: Colors.text },
  entregaEstado: { ...Typography.small, color: Colors.textMuted },
  entregaNota: { width: 60, backgroundColor: Colors.surfaceSunken, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 7, fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.text, textAlign: 'center' },
  entregaSave: { width: 40, height: 38, borderRadius: Radius.sm, backgroundColor: Colors.primaryDeep, alignItems: 'center', justifyContent: 'center' },
})
