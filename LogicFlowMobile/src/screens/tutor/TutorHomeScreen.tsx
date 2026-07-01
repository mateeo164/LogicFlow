import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { Screen, PageHeader, Pill } from '../../components/ui'
import { GradientCard } from '../../components/GradientCard'
import { StatCard } from '../../components/StatCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { InputField } from '../../components/InputField'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'
import { Clase, RosterEntry, crearClase, obtenerMisClases, obtenerRoster } from '../../services/clases'

interface ClaseConRoster {
  clase: Clase
  roster: RosterEntry[]
}

export function TutorHomeScreen() {
  const [items, setItems] = useState<ClaseConRoster[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [modalVisible, setModalVisible] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [creando, setCreando] = useState(false)
  const [codigoCreado, setCodigoCreado] = useState<string | null>(null)
  const [errorCrear, setErrorCrear] = useState<string | null>(null)

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const clases = await obtenerMisClases()
    const rosters = await Promise.all(clases.map(c => obtenerRoster(c.id)))
    setItems(clases.map((clase, i) => ({ clase, roster: rosters[i] })))
    setLoading(false)
    setRefreshing(false)
  }, [])

  useFocusEffect(useCallback(() => { cargar(true) }, [cargar]))

  const totalEstudiantes = items.reduce((s, i) => s + i.roster.length, 0)
  const totalAprobados = items.reduce((s, i) => s + i.roster.filter(r => r.progreso?.ensamble_web_aprobado === true).length, 0)

  function abrirModal() {
    setNombre('')
    setDescripcion('')
    setCodigoCreado(null)
    setErrorCrear(null)
    setModalVisible(true)
  }

  async function handleCrear() {
    if (!nombre.trim()) return
    setCreando(true)
    setErrorCrear(null)
    const clase = await crearClase({ nombre, descripcion })
    setCreando(false)
    if (clase) {
      setCodigoCreado(clase.codigo)
      await cargar(true)
    } else {
      setErrorCrear('No se pudo crear la clase. Intenta de nuevo.')
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  }

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar() }} tintColor={Colors.primary} />}
    >
      <PageHeader overline="PANEL DOCENTE" title="Mis clases" subtitle="Crea una clase y comparte su código con tus estudiantes." />

      <View style={styles.statsRow}>
        <StatCard icon="🏫" label="Clases activas" value={items.length} color={Colors.primary} />
        <StatCard icon="🧑‍🎓" label="Estudiantes" value={totalEstudiantes} color={Colors.accent} />
        <StatCard icon="✅" label="Aprobó web" value={totalAprobados} color={Colors.success} />
      </View>

      <PrimaryButton label="+ Crear clase" onPress={abrirModal} style={{ marginBottom: Spacing.md }} />

      {items.length === 0 ? (
        <GradientCard tone="sunken" style={{ alignItems: 'center', gap: 4 }}>
          <Text style={styles.emptyText}>Aún no tienes clases. Crea la primera para empezar a ver el progreso de tus estudiantes.</Text>
        </GradientCard>
      ) : (
        items.map(({ clase, roster }) => {
          const aprobados = roster.filter(r => r.progreso?.ensamble_web_aprobado === true).length
          return (
            <Pressable
              key={clase.id}
              onPress={() => router.push({ pathname: '/(tutor)/clase/[id]', params: { id: clase.id } })}
              style={({ pressed }) => [styles.claseCard, Shadow.sm, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
            >
              <View style={styles.claseTop}>
                <Text style={styles.claseNombre} numberOfLines={1}>{clase.nombre}</Text>
                <Pill label={clase.codigo} tone="accent" />
              </View>
              {clase.descripcion ? <Text style={styles.claseDesc} numberOfLines={2}>{clase.descripcion}</Text> : null}
              <View style={styles.claseStats}>
                <Text style={styles.claseStatText}><Text style={styles.claseStatNum}>{roster.length}</Text> estudiante{roster.length === 1 ? '' : 's'}</Text>
                <Text style={styles.claseStatText}><Text style={styles.claseStatNum}>{aprobados}</Text> aprobó web</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </View>
            </Pressable>
          )
        })
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Crear clase</Text>

              {codigoCreado ? (
                <View style={{ gap: Spacing.md }}>
                  <GradientCard tone="success" style={{ alignItems: 'center', gap: 6 }}>
                    <Text style={styles.codigoLabel}>Código para compartir</Text>
                    <Text style={styles.codigoValue}>{codigoCreado}</Text>
                  </GradientCard>
                  <PrimaryButton label="Listo" onPress={() => setModalVisible(false)} />
                </View>
              ) : (
                <View style={{ gap: Spacing.sm }}>
                  <InputField label="Nombre de la clase" value={nombre} onChangeText={setNombre} placeholder="Ej. Hardware 3A" icon="school-outline" />
                  <InputField label="Descripción (opcional)" value={descripcion} onChangeText={setDescripcion} placeholder="" icon="document-text-outline" />
                  {errorCrear ? <Text style={styles.errorText}>{errorCrear}</Text> : null}
                  <PrimaryButton label="Crear clase" onPress={handleCrear} loading={creando} style={{ marginTop: Spacing.xs }} />
                  <PrimaryButton label="Cancelar" onPress={() => setModalVisible(false)} variant="secondary" />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },

  claseCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: 6,
  },
  claseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  claseNombre: { flex: 1, fontFamily: Fonts.serif, fontSize: 16, color: Colors.text },
  claseDesc: { ...Typography.caption },
  claseStats: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 4 },
  claseStatText: { ...Typography.small, flex: 1 },
  claseStatNum: { fontFamily: Fonts.sansBold, color: Colors.text },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.lg, paddingBottom: Spacing.xl, maxHeight: '80%' },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.borderStrong, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { ...Typography.h2, marginBottom: Spacing.md },
  errorText: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.error },
  codigoLabel: { ...Typography.caption },
  codigoValue: { fontFamily: Fonts.serif, fontSize: 34, letterSpacing: 2, color: Colors.success },
})
