import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { PC_COMPONENTS, PCComponent } from '../../constants/components'
import { guardarProgreso, reiniciarProgreso, obtenerProgreso, registrarEvento } from '../../services/progress'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'
import { GradientCard } from '../../components/GradientCard'
import { PrimaryButton } from '../../components/PrimaryButton'

export function AssemblyScreen() {
  const [instalados, setInstalados] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [sessionStart] = useState(Date.now())
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    obtenerProgreso().then(p => {
      const installed = p?.componentes_instalados || []
      setInstalados(installed)
      setCurrentStep(installed.length)
      if (installed.length >= PC_COMPONENTS.length) setCompleted(true)
      setLoading(false)
    })
  }, [])

  async function handleInstall(component: PCComponent) {
    setSaving(true)
    const segundos = Math.round((Date.now() - sessionStart) / 1000)
    const ok = await guardarProgreso({ componenteId: component.id, segundos })
    if (ok) {
      await registrarEvento({ tipo: 'acierto', componenteId: component.id, segundos })
      const newInstalados = [...instalados, component.id]
      setInstalados(newInstalados)
      setCurrentStep(newInstalados.length)
      if (newInstalados.length >= PC_COMPONENTS.length) setCompleted(true)
    } else {
      Alert.alert('Error', 'No se pudo guardar el progreso. Verifica tu conexión.')
    }
    setSaving(false)
  }

  async function handleReset() {
    Alert.alert(
      'Reiniciar ensamblaje',
      '¿Seguro que quieres empezar desde cero? Tus estadísticas acumuladas se conservan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: async () => {
            await reiniciarProgreso()
            setInstalados([])
            setCurrentStep(0)
            setCompleted(false)
          },
        },
      ]
    )
  }

  const progressPercent = Math.round((instalados.length / PC_COMPONENTS.length) * 100)

  if (loading) return <View style={styles.safe} />

  if (completed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.completedContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.celebrateBadge}>
            <Text style={{ fontSize: 64 }}>🎉</Text>
          </View>
          <Text style={styles.completedTitle}>¡PC ensamblada!</Text>
          <Text style={styles.completedSub}>
            Completaste el ensamblaje de los 8 componentes. Tu PC virtual está lista.
          </Text>
          <GradientCard style={{ width: '100%' }}>
            <Text style={styles.cardSection}>Componentes instalados</Text>
            {PC_COMPONENTS.map((c, i) => (
              <View key={c.id} style={[styles.completedRow, i === PC_COMPONENTS.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={{ fontSize: 20 }}>{c.icon}</Text>
                <Text style={styles.completedName}>{c.label}</Text>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </View>
            ))}
          </GradientCard>
          <PrimaryButton label="Nueva simulación" icon="↻" onPress={handleReset} variant="secondary" style={{ width: '100%' }} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const currentComponent = currentStep < PC_COMPONENTS.length ? PC_COMPONENTS[currentStep] : null

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={Typography.overline}>SIMULADOR</Text>
          <Text style={Typography.h1}>Guía de ensamble</Text>
        </View>

        {/* Progress card */}
        <GradientCard style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressLabel}>Progreso del build</Text>
            <Text style={styles.progressPct}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressStep}>Paso {Math.min(currentStep + 1, PC_COMPONENTS.length)} de {PC_COMPONENTS.length}</Text>
        </GradientCard>

        {/* Timeline */}
        <View style={styles.timeline}>
          {PC_COMPONENTS.map((comp, idx) => {
            const isDone = instalados.includes(comp.id)
            const isCurrent = idx === currentStep
            const isPending = !isDone && !isCurrent
            return (
              <View key={comp.id} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.dot,
                    isDone ? styles.dotDone : isCurrent ? styles.dotCurrent : styles.dotPending,
                  ]}>
                    {isDone
                      ? <Ionicons name="checkmark" size={15} color={Colors.textInverse} />
                      : <Text style={[styles.dotText, isCurrent && { color: Colors.textInverse }]}>{idx + 1}</Text>}
                  </View>
                  {idx < PC_COMPONENTS.length - 1 && (
                    <View style={[styles.line, isDone && styles.lineDone]} />
                  )}
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.stepCard,
                    isCurrent && styles.stepCardCurrent,
                    isCurrent && Shadow.md,
                    isDone && styles.stepCardDone,
                    pressed && isCurrent && { transform: [{ scale: 0.99 }] },
                  ]}
                  disabled={!isCurrent || saving}
                  onPress={() => isCurrent && currentComponent && handleInstall(currentComponent)}
                >
                  <View style={styles.stepCardRow}>
                    <Text style={{ fontSize: 26, opacity: isPending ? 0.4 : 1 }}>{comp.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.compName, isPending && { color: Colors.textMuted }]}>{comp.label}</Text>
                      <Text style={styles.compShort} numberOfLines={1}>{comp.shortDesc}</Text>
                    </View>
                    {isCurrent && !isDone && (
                      <View style={styles.installBadge}>
                        <Text style={styles.installText}>{saving ? '…' : 'Instalar'}</Text>
                      </View>
                    )}
                    {isDone && <Ionicons name="checkmark-circle" size={22} color={Colors.success} />}
                  </View>
                  {isCurrent && !isDone && (
                    <View style={styles.hint}>
                      <View style={styles.hintHead}>
                        <Ionicons name="bulb-outline" size={14} color={Colors.accentDeep} />
                        <Text style={styles.hintTitle}>Consejo</Text>
                      </View>
                      <Text style={styles.hintText}>{comp.assemblyHint}</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )
          })}
        </View>

        {instalados.length > 0 && (
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={16} color={Colors.error} />
            <Text style={styles.resetText}>Reiniciar ensamblaje</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 120 },
  header: { marginBottom: Spacing.md, gap: 2 },

  progressCard: { marginBottom: Spacing.lg, gap: 10 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  progressLabel: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.text },
  progressPct: { fontFamily: Fonts.serif, fontSize: 22, color: Colors.accent },
  progressTrack: { height: 10, backgroundColor: Colors.surfaceSunken, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.success, borderRadius: Radius.full },
  progressStep: { ...Typography.caption },

  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: Spacing.sm },
  timelineLeft: { alignItems: 'center', width: 30 },
  dot: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  dotDone: { backgroundColor: Colors.success },
  dotCurrent: { backgroundColor: Colors.primaryDeep },
  dotPending: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.borderStrong },
  dotText: { fontFamily: Fonts.sansBold, fontSize: 12, color: Colors.textMuted },
  line: { flex: 1, width: 2, backgroundColor: Colors.border, marginVertical: 2 },
  lineDone: { backgroundColor: Colors.success },
  stepCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  stepCardCurrent: { borderColor: Colors.primaryMid, borderWidth: 1.5 },
  stepCardDone: { backgroundColor: Colors.surfaceAlt, opacity: 0.85 },
  stepCardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  compName: { fontFamily: Fonts.sansBold, fontSize: 15, color: Colors.text },
  compShort: { ...Typography.caption, marginTop: 1 },
  installBadge: { backgroundColor: Colors.primaryDeep, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 7 },
  installText: { fontFamily: Fonts.sansBold, fontSize: 12, color: Colors.textInverse },
  hint: { marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.accentSoft, borderRadius: Radius.sm },
  hintHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  hintTitle: { fontFamily: Fonts.sansBold, fontSize: 12, color: Colors.accentDeep },
  hintText: { fontFamily: Fonts.sans, fontSize: 13, color: '#6b4416', lineHeight: 19 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: Spacing.md, marginTop: Spacing.sm },
  resetText: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.error },

  completedContainer: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.lg, paddingTop: Spacing.xl },
  celebrateBadge: { width: 110, height: 110, borderRadius: 34, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', ...Shadow.md },
  completedTitle: { ...Typography.display, textAlign: 'center' },
  completedSub: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 23 },
  cardSection: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.text, marginBottom: Spacing.sm },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  completedName: { fontFamily: Fonts.sans, fontSize: 14.5, color: Colors.text, flex: 1 },
})
