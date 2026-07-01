import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { PC_COMPONENTS } from '../../constants/components'
import { obtenerProgreso, reiniciarProgresoReal, ensambleWebAprobado, NOTA_MINIMA } from '../../services/progress'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'
import { GradientCard } from '../../components/GradientCard'
import { PrimaryButton } from '../../components/PrimaryButton'

/**
 * Guía del ENSAMBLE REAL: manual paso a paso que se sigue mientras armas la PC
 * física con la cámara AR. Refleja automáticamente el progreso del scanner
 * (ensamble_real_instalados). No marca pasos por toque: eso lo hace el AR.
 */
export function AssemblyScreen() {
  const [instalados, setInstalados] = useState<string[]>([])
  const [aprobado, setAprobado] = useState(false)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    const p = await obtenerProgreso()
    setInstalados(p?.ensamble_real_instalados || [])
    setAprobado(ensambleWebAprobado(p))
    setLoading(false)
  }, [])

  // Recarga al enfocar → el progreso se actualiza al volver del scanner AR.
  useFocusEffect(useCallback(() => { cargar() }, [cargar]))

  async function handleReset() {
    Alert.alert(
      'Reiniciar ensamble real',
      '¿Empezar el ensamble real desde cero? Esto no afecta tu nota del ensamble web.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: async () => { await reiniciarProgresoReal(); setInstalados([]) },
        },
      ]
    )
  }

  const total = PC_COMPONENTS.length
  const currentStep = instalados.length
  const progressPercent = Math.round((instalados.length / total) * 100)
  const completado = instalados.length >= total

  if (loading) return <View style={styles.safe} />

  if (completado) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.completedContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.celebrateBadge}>
            <Text style={{ fontSize: 64 }}>🛠️</Text>
          </View>
          <Text style={styles.completedTitle}>¡PC real ensamblada!</Text>
          <Text style={styles.completedSub}>
            Instalaste los {total} componentes en tu PC física con la cámara AR. ¡Gran trabajo!
          </Text>
          <GradientCard style={{ width: '100%' }}>
            <Text style={styles.cardSection}>Componentes instalados</Text>
            {PC_COMPONENTS.map((c, i) => (
              <View key={c.id} style={[styles.completedRow, i === total - 1 && { borderBottomWidth: 0 }]}>
                <Text style={{ fontSize: 20 }}>{c.icon}</Text>
                <Text style={styles.completedName}>{c.label}</Text>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </View>
            ))}
          </GradientCard>
          <PrimaryButton label="Reiniciar ensamble real" icon="↻" onPress={handleReset} variant="secondary" style={{ width: '100%' }} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={Typography.overline}>MANUAL</Text>
          <Text style={Typography.h1}>Guía del ensamble real</Text>
          <Text style={styles.subtitle}>
            Sigue estos pasos mientras armas tu PC física con la cámara AR.
          </Text>
        </View>

        {!aprobado && (
          <GradientCard tone="accent" style={styles.lockBanner}>
            <View style={styles.lockBannerRow}>
              <Ionicons name="lock-closed" size={20} color={Colors.accentDeep} />
              <Text style={styles.lockBannerText}>
                El ensamble real se desbloquea al aprobar el ensamble web (nota ≥ {NOTA_MINIMA}). Abajo tienes el manual como referencia.
              </Text>
            </View>
          </GradientCard>
        )}

        {/* CTA principal: abrir la cámara AR */}
        <PrimaryButton
          label={aprobado ? 'Abrir cámara AR' : 'Ver ensamble real'}
          icon="📷"
          onPress={() => router.push('/(tabs)/scanner')}
          style={{ marginBottom: Spacing.lg }}
        />

        {/* Progress card */}
        <GradientCard style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressLabel}>Progreso del ensamble real</Text>
            <Text style={styles.progressPct}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressStep}>{instalados.length} de {total} componentes instalados</Text>
        </GradientCard>

        {/* Timeline (solo referencia — se completa desde el scanner AR) */}
        <View style={styles.timeline}>
          {PC_COMPONENTS.map((comp, idx) => {
            const isDone = instalados.includes(comp.id)
            const isCurrent = !isDone && idx === currentStep
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
                  {idx < total - 1 && <View style={[styles.line, isDone && styles.lineDone]} />}
                </View>
                <View style={[
                  styles.stepCard,
                  isCurrent && styles.stepCardCurrent,
                  isCurrent && Shadow.md,
                  isDone && styles.stepCardDone,
                ]}>
                  <View style={styles.stepCardRow}>
                    <Text style={{ fontSize: 26, opacity: isPending ? 0.4 : 1 }}>{comp.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.compName, isPending && { color: Colors.textMuted }]}>{comp.label}</Text>
                      <Text style={styles.compShort} numberOfLines={1}>{comp.shortDesc}</Text>
                    </View>
                    {isDone
                      ? <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                      : isCurrent && <View style={styles.nextBadge}><Text style={styles.nextText}>Siguiente</Text></View>}
                  </View>
                  {!isDone && (
                    <View style={styles.hint}>
                      <View style={styles.hintHead}>
                        <Ionicons name="bulb-outline" size={14} color={Colors.accentDeep} />
                        <Text style={styles.hintTitle}>Cómo instalarlo</Text>
                      </View>
                      <Text style={styles.hintText}>{comp.assemblyHint}</Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })}
        </View>

        {instalados.length > 0 && (
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={16} color={Colors.error} />
            <Text style={styles.resetText}>Reiniciar ensamble real</Text>
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
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4, lineHeight: 22 },

  lockBanner: { marginBottom: Spacing.md },
  lockBannerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  lockBannerText: { flex: 1, fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.accentDeep, lineHeight: 19 },

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
  nextBadge: { backgroundColor: Colors.primaryTint, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 6 },
  nextText: { fontFamily: Fonts.sansBold, fontSize: 12, color: Colors.primaryDeep },
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
