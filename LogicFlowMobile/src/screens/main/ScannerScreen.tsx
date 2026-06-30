import React, { useState, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
  Animated, Alert, ActivityIndicator, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { PC_COMPONENTS, PCComponent } from '../../constants/components'
import { guardarProgreso, registrarEvento } from '../../services/progress'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'
import { PrimaryButton } from '../../components/PrimaryButton'
import { GradientCard } from '../../components/GradientCard'
import { Pill } from '../../components/ui'

type ScanState = 'idle' | 'scanning' | 'result' | 'quiz'

async function simulateAIDetection(instalados: string[]): Promise<PCComponent> {
  await new Promise(r => setTimeout(r, 2200))
  const pending = PC_COMPONENTS.filter(c => !instalados.includes(c.id))
  if (pending.length === 0) return PC_COMPONENTS[Math.floor(Math.random() * PC_COMPONENTS.length)]
  return pending[Math.floor(Math.random() * Math.min(pending.length, 3))]
}

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [detected, setDetected] = useState<PCComponent | null>(null)
  const [instalados, setInstalados] = useState<string[]>([])
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [saving, setSaving] = useState(false)
  const scanAnim = useRef(new Animated.Value(0)).current

  const startScanAnimation = useCallback(() => {
    scanAnim.setValue(0)
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start()
  }, [scanAnim])

  async function handleScan() {
    setScanState('scanning')
    startScanAnimation()
    try {
      const component = await simulateAIDetection(instalados)
      setDetected(component)
      setScanState('result')
    } catch {
      setScanState('idle')
      Alert.alert('Error', 'No se pudo procesar la imagen. Intenta de nuevo.')
    }
  }

  async function handleInstall() {
    if (!detected) return
    setSaving(true)
    const start = Date.now()
    await guardarProgreso({ componenteId: detected.id, segundos: 0 })
    await registrarEvento({ tipo: 'acierto', componenteId: detected.id, segundos: Math.round((Date.now() - start) / 1000) })
    setInstalados(prev => [...prev, detected.id])
    setSaving(false)
    setScanState('quiz')
    setQuizAnswer(null)
    setQuizFeedback(null)
  }

  function handleQuizAnswer(idx: number) {
    if (quizAnswer !== null) return
    setQuizAnswer(idx)
    const correct = idx === detected?.quizAnswerIndex
    setQuizFeedback(correct ? 'correct' : 'wrong')
    if (!correct && detected) registrarEvento({ tipo: 'error_pieza', componenteId: detected.id })
  }

  function handleClose() {
    setScanState('idle')
    setDetected(null)
    setQuizAnswer(null)
    setQuizFeedback(null)
  }

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permSafe} edges={['top', 'bottom']}>
        <View style={styles.permissionBox}>
          <View style={styles.permIcon}>
            <Ionicons name="camera-outline" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.permTitle}>Acceso a la cámara</Text>
          <Text style={styles.permText}>
            LogicFlow usa la cámara para el modo AR de detección de componentes. Solo se activa cuando
            presionas el botón de escaneo.
          </Text>
          <PrimaryButton label="Permitir cámara" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.permCancel}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />
      </View>

      <SafeAreaView style={styles.cameraUi} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.glassBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escáner AR</Text>
          <View style={styles.counterChip}>
            <Text style={styles.counterText}>{instalados.length}/8</Text>
          </View>
        </View>

        {/* Frame */}
        <View style={styles.frameArea} pointerEvents="none">
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {scanState === 'scanning' && (
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-FRAME_SIZE / 2 + 10, FRAME_SIZE / 2 - 10] }) }] }]}
              />
            )}
          </View>
          <Text style={styles.frameHint}>
            {scanState === 'idle' ? 'Apunta hacia un componente de PC' :
             scanState === 'scanning' ? 'Analizando componente…' : ''}
          </Text>
        </View>

        {/* Bottom */}
        <View style={styles.bottom}>
          {scanState === 'idle' && (
            <>
              <Text style={styles.bottomTitle}>Detección por IA</Text>
              <Text style={styles.bottomSub}>Apunta la cámara a un componente y presiona escanear.</Text>
              <Pressable onPress={handleScan} style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.95 }] }]}>
                <View style={styles.shutterInner}>
                  <Ionicons name="scan" size={30} color={Colors.primaryDeep} />
                </View>
              </Pressable>
            </>
          )}
          {scanState === 'scanning' && (
            <View style={{ alignItems: 'center', gap: Spacing.sm }}>
              <ActivityIndicator color={Colors.white} size="large" />
              <Text style={styles.bottomTitle}>Procesando imagen…</Text>
              <Text style={styles.bottomSub}>El modelo de IA está identificando el componente</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Result sheet */}
      <Modal visible={scanState === 'result' && detected !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.lg }}>
              <View style={styles.detectedHeader}>
                <View style={styles.detectedIcon}>
                  <Text style={{ fontSize: 40 }}>{detected?.icon}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Pill label="✓ Detectado por IA" tone="success" />
                  <Text style={styles.detectedName}>{detected?.label}</Text>
                  <Text style={styles.detectedXp}>+{detected?.xpValue} XP al instalar</Text>
                </View>
              </View>

              <Text style={styles.detectedDesc}>{detected?.fullDesc}</Text>

              <GradientCard tone="navy" style={{ marginVertical: Spacing.md }}>
                <Text style={[styles.calloutTitle, { color: Colors.primaryDeep }]}>💡 Analogía pedagógica</Text>
                <Text style={styles.calloutText}>{detected?.analogy}</Text>
              </GradientCard>

              <GradientCard tone="accent" style={{ marginBottom: Spacing.md }}>
                <Text style={[styles.calloutTitle, { color: Colors.accentDeep }]}>✨ Dato curioso</Text>
                <Text style={[styles.calloutText, { color: '#6b4416' }]}>{detected?.funFact}</Text>
              </GradientCard>

              <Text style={styles.specsTitle}>Especificaciones</Text>
              <GradientCard padded={false} style={{ overflow: 'hidden', marginTop: Spacing.sm }}>
                {detected?.specs.map((s, i) => (
                  <View key={i} style={[styles.specRow, i === (detected?.specs.length ?? 0) - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.specLabel}>{s.label}</Text>
                    <Text style={styles.specValue}>{s.value}</Text>
                  </View>
                ))}
              </GradientCard>

              <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
                <PrimaryButton label={saving ? 'Instalando…' : `Instalar ${detected?.label}`} icon="✓" onPress={handleInstall} loading={saving} />
                <TouchableOpacity style={styles.skipBtn} onPress={handleClose}>
                  <Text style={styles.skipText}>Escanear otro</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quiz sheet */}
      <Modal visible={scanState === 'quiz' && detected !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.quizSheet}>
            <View style={styles.quizBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.quizBadgeText}>¡Componente instalado!</Text>
            </View>
            <Text style={styles.quizTitle}>Prueba de conocimiento</Text>
            <Text style={styles.quizQuestion}>{detected?.quizQuestion}</Text>

            {detected?.quizOptions.map((opt, idx) => {
              let bg: string = Colors.surface
              let bc: string = Colors.border
              if (quizAnswer !== null) {
                if (idx === detected.quizAnswerIndex) { bg = Colors.successSoft; bc = Colors.success }
                else if (idx === quizAnswer) { bg = Colors.errorSoft; bc = Colors.error }
              }
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.quizOption, { backgroundColor: bg, borderColor: bc }]}
                  onPress={() => handleQuizAnswer(idx)}
                  disabled={quizAnswer !== null}
                  activeOpacity={0.85}
                >
                  <Text style={styles.quizOptionText}>{String.fromCharCode(65 + idx)}. {opt}</Text>
                </TouchableOpacity>
              )
            })}

            {quizFeedback && (
              <GradientCard tone={quizFeedback === 'correct' ? 'success' : 'danger'} style={{ marginTop: Spacing.sm }}>
                <Text style={[styles.feedbackText, { color: quizFeedback === 'correct' ? Colors.success : Colors.error }]}>
                  {quizFeedback === 'correct'
                    ? '¡Excelente! Respuesta correcta. +10 XP de conocimiento.'
                    : `La respuesta correcta es: "${detected?.quizOptions[detected.quizAnswerIndex]}"`}
                </Text>
              </GradientCard>
            )}

            {quizAnswer !== null && (
              <PrimaryButton label="Continuar escaneando" onPress={handleClose} style={{ marginTop: Spacing.md }} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const CORNER_SIZE = 26
const CORNER_WIDTH = 3
const FRAME_SIZE = 260

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0a09' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scrim: { backgroundColor: 'rgba(12,10,9,0.35)' },
  cameraUi: { flex: 1, justifyContent: 'space-between' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  glassBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.white },
  counterChip: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: Radius.full, paddingHorizontal: 12, height: 40, alignItems: 'center', justifyContent: 'center' },
  counterText: { fontFamily: Fonts.sansBold, fontSize: 13, color: Colors.white },

  frameArea: { alignItems: 'center', gap: Spacing.lg },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: Colors.accentBright },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 8 },
  scanLine: { position: 'absolute', left: 8, right: 8, height: 2.5, backgroundColor: Colors.accentBright, shadowColor: Colors.accentBright, shadowOpacity: 0.9, shadowRadius: 8, elevation: 4 },
  frameHint: { fontFamily: Fonts.sansMedium, fontSize: 14, color: Colors.white, textAlign: 'center' },

  bottom: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  bottomTitle: { fontFamily: Fonts.serif, fontSize: 19, color: Colors.white, textAlign: 'center' },
  bottomSub: { fontFamily: Fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.72)', textAlign: 'center' },
  shutter: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  shutterInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.lg, paddingBottom: Spacing.xl, maxHeight: '88%' },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.borderStrong, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  detectedHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  detectedIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  detectedName: { ...Typography.h2 },
  detectedXp: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.accent },
  detectedDesc: { ...Typography.body, color: Colors.textSecondary, lineHeight: 23 },
  calloutTitle: { fontFamily: Fonts.sansBold, fontSize: 14, marginBottom: 5 },
  calloutText: { fontFamily: Fonts.sans, fontSize: 14, color: Colors.text, lineHeight: 22 },
  specsTitle: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.text },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  specLabel: { ...Typography.caption },
  specValue: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.primary, maxWidth: '58%', textAlign: 'right' },
  skipBtn: { alignItems: 'center', padding: Spacing.sm },
  skipText: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.textSecondary },

  quizSheet: { backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm },
  quizBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  quizBadgeText: { fontFamily: Fonts.sansBold, fontSize: 13, color: Colors.success },
  quizTitle: { ...Typography.h2, textAlign: 'center' },
  quizQuestion: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.sm, lineHeight: 22 },
  quizOption: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, ...Shadow.sm },
  quizOptionText: { fontFamily: Fonts.sans, fontSize: 14.5, color: Colors.text },
  feedbackText: { fontFamily: Fonts.sansSemi, fontSize: 14, lineHeight: 21 },

  permSafe: { flex: 1, backgroundColor: Colors.background },
  permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  permIcon: { width: 88, height: 88, borderRadius: 28, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  permTitle: { ...Typography.h1, textAlign: 'center' },
  permText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 23 },
  permCancel: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingTop: Spacing.xs },
})
