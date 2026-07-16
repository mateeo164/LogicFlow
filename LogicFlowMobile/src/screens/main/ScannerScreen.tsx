import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
  Animated, Alert, ActivityIndicator, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { CameraView, useCameraPermissions } from 'expo-camera'
import {
  useAudioRecorder, useAudioRecorderState, RecordingPresets,
  setAudioModeAsync, requestRecordingPermissionsAsync,
} from 'expo-audio'
import { File } from 'expo-file-system'
import * as Speech from 'expo-speech'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { PC_COMPONENTS, PCComponent } from '../../constants/components'
import { guardarProgreso, registrarEvento, obtenerProgreso, reiniciarProgreso } from '../../services/progress'
import { otorgarLogros } from '../../services/logros'
import { detectarComponente, preguntarSobreComponente, RateLimitedError } from '../../services/ai'
import { sfx } from '../../services/sound'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'
import { PrimaryButton } from '../../components/PrimaryButton'
import { GradientCard } from '../../components/GradientCard'
import { Pill } from '../../components/ui'

type ScanState = 'idle' | 'scanning' | 'result' | 'quiz' | 'listening' | 'thinking'
type Turno = { rol: 'ia' | 'usuario'; texto: string }

const COOLDOWN_MS = 3000

function hablar(texto: string) {
  if (!texto) return
  Speech.stop()
  Speech.speak(texto, { language: 'es-ES' })
}

function mostrarErrorIA(err: unknown, mensajeGenerico: string) {
  if (err instanceof RateLimitedError) {
    Alert.alert('Mucha demanda', 'Hay mucha gente usando el escáner ahora mismo. Espera unos segundos e intenta de nuevo.')
  } else {
    Alert.alert('Error', mensajeGenerico)
  }
}

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const tabBarHeight = useBottomTabBarHeight()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [detected, setDetected] = useState<PCComponent | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualPickerVisible, setManualPickerVisible] = useState(false)
  const [instalados, setInstalados] = useState<string[]>([])
  const [showComplete, setShowComplete] = useState(false)
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [saving, setSaving] = useState(false)
  const [conversacion, setConversacion] = useState<Turno[]>([])
  const scanAnim = useRef(new Animated.Value(0)).current
  const cameraRef = useRef<CameraView>(null)
  const lastPhotoBase64 = useRef<string | null>(null)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const recorderState = useAudioRecorderState(recorder)
  const [cooldown, setCooldown] = useState(false)
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startCooldown = useCallback(() => {
    setCooldown(true)
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current)
    cooldownTimer.current = setTimeout(() => setCooldown(false), COOLDOWN_MS)
  }, [])

  useEffect(() => () => {
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current)
  }, [])

  // Carga las piezas ya escaneadas para que el contador sea persistente
  // entre sesiones y el ensamble se complete al escanear todas las piezas.
  useEffect(() => {
    obtenerProgreso().then(p => {
      if (p?.componentes_instalados?.length) setInstalados(p.componentes_instalados)
    })
  }, [])

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
    if (!cameraRef.current || cooldown) return
    setScanState('scanning')
    startScanAnimation()
    sfx.shutter()
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 })
      if (!photo?.base64) throw new Error('Sin datos de imagen')

      const res = await detectarComponente({ imageBase64: photo.base64, installedIds: instalados })
      const component = res.componentId ? PC_COMPONENTS.find(c => c.id === res.componentId) ?? null : null

      if (!component) {
        setScanState('idle')
        sfx.error()
        const mensaje = res.reply || 'No reconozco un componente de PC en la imagen. Apunta a una pieza real e intenta de nuevo.'
        hablar(mensaje)
        Alert.alert('No reconocido', mensaje)
        return
      }

      lastPhotoBase64.current = photo.base64
      setDetected(component)
      setConversacion([{ rol: 'ia', texto: res.reply }])
      setScanState('result')
      sfx.success()
      hablar(res.reply)
      otorgarLogros(['escaner_novato'], 'scanner')
    } catch (err) {
      setScanState('idle')
      sfx.error()
      mostrarErrorIA(err, 'No se pudo procesar la imagen. Intenta de nuevo.')
    } finally {
      startCooldown()
    }
  }

  async function handleAskStart() {
    if (cooldown) return
    sfx.tap()
    const perm = await requestRecordingPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permiso de micrófono', 'Actívalo para poder hacerle preguntas a la IA por voz.')
      return
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record()
      setScanState('listening')
    } catch {
      Alert.alert('Error', 'No se pudo iniciar la grabación.')
    }
  }

  async function handleAskStop() {
    if (!recorderState.isRecording) { setScanState('result'); return }
    setScanState('thinking')
    try {
      await recorder.stop()
      const uri = recorder.uri
      if (!uri || !detected || !lastPhotoBase64.current) throw new Error('Falta contexto de la grabación')

      const audioBase64 = await new File(uri).base64()
      const res = await preguntarSobreComponente({
        imageBase64: lastPhotoBase64.current,
        audioBase64,
        audioMimeType: 'audio/aac',
        componentId: detected.id,
      })

      setConversacion(prev => [...prev, { rol: 'usuario', texto: '🎤 Pregunta por voz' }, { rol: 'ia', texto: res.reply }])
      sfx.success()
      hablar(res.reply)
    } catch (err) {
      sfx.error()
      mostrarErrorIA(err, 'No se pudo procesar tu pregunta. Intenta de nuevo.')
    } finally {
      setScanState('result')
      startCooldown()
    }
  }

  async function handleInstall() {
    if (!detected) return
    Speech.stop()
    setSaving(true)
    const start = Date.now()
    await guardarProgreso({ componenteId: detected.id, segundos: 0, total: PC_COMPONENTS.length })
    await registrarEvento({ tipo: 'acierto', componenteId: detected.id, segundos: Math.round((Date.now() - start) / 1000) })
    const nuevos = instalados.includes(detected.id) ? instalados : [...instalados, detected.id]
    setInstalados(nuevos)
    setSaving(false)
    if (nuevos.length >= PC_COMPONENTS.length) {
      otorgarLogros(['instalacion_real'], 'scanner')
      sfx.complete()
    }
    setScanState('quiz')
    setQuizAnswer(null)
    setQuizFeedback(null)
    sfx.success()
  }

  function handleManualPick(component: PCComponent) {
    Alert.alert(
      'Marcar sin escanear',
      `Confirma que tu equipo no tiene "${component.label}" (por ejemplo, usa gráficos integrados en vez de una tarjeta gráfica dedicada). Se marcará como completado sin necesidad de escanearlo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            Speech.stop()
            lastPhotoBase64.current = null
            setManualMode(true)
            setDetected(component)
            setConversacion([{
              rol: 'ia',
              texto: `Marcaste "${component.label}" como no disponible en tu equipo. Aquí tienes la información para que aprendas igual — quedará contabilizado como instalado.`,
            }])
            setManualPickerVisible(false)
            setScanState('result')
            sfx.tap()
          },
        },
      ]
    )
  }

  function handleQuizAnswer(idx: number) {
    if (quizAnswer !== null) return
    setQuizAnswer(idx)
    const correct = idx === detected?.quizAnswerIndex
    setQuizFeedback(correct ? 'correct' : 'wrong')
    if (correct) sfx.success(); else sfx.error()
    if (detected) {
      if (correct) {
        otorgarLogros(['quiz_perfecto'], `quiz:${detected.id}`)
      } else {
        registrarEvento({ tipo: 'error_ensamble', componenteId: detected.id, detalle: `Quiz: ${detected.label}` })
      }
    }
  }

  function handleClose() {
    Speech.stop()
    setScanState('idle')
    setDetected(null)
    setManualMode(false)
    setQuizAnswer(null)
    setQuizFeedback(null)
    setConversacion([])
    lastPhotoBase64.current = null
    // Si ya se escanearon todas las piezas, muestra la celebración de ensamble.
    if (instalados.length >= PC_COMPONENTS.length) setShowComplete(true)
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
            setShowComplete(false)
          },
        },
      ]
    )
  }

  const pendientes = PC_COMPONENTS.filter(c => !instalados.includes(c.id))

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
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />
      </View>

      <SafeAreaView style={styles.cameraUi} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.glassBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escáner AR</Text>
          <View style={styles.counterChip}>
            <Text style={styles.counterText}>{instalados.length}/{PC_COMPONENTS.length}</Text>
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
            {scanState === 'idle' && cooldown ? 'Espera un momento…' :
             scanState === 'idle' ? 'Apunta hacia un componente de PC' :
             scanState === 'scanning' ? 'Analizando componente…' : ''}
          </Text>
        </View>

        {/* Bottom — reserva la altura de la tab bar flotante para que el
            obturador no quede oculto tras la barra inferior de menús. */}
        <View style={[styles.bottom, { paddingBottom: tabBarHeight + Spacing.md }]}>
          {scanState === 'idle' && (
            <>
              <Text style={styles.bottomTitle}>Detección por IA</Text>
              <Text style={styles.bottomSub}>
                {cooldown ? 'Espera un momento antes de volver a escanear.' : 'Apunta la cámara a un componente y presiona escanear.'}
              </Text>
              <Pressable
                onPress={handleScan}
                disabled={cooldown}
                style={({ pressed }) => [styles.shutter, cooldown && styles.shutterDisabled, pressed && !cooldown && { transform: [{ scale: 0.95 }] }]}
              >
                <View style={styles.shutterInner}>
                  <Ionicons name="scan" size={30} color={Colors.primaryDeep} />
                </View>
              </Pressable>
              {pendientes.length > 0 && (
                <TouchableOpacity onPress={() => setManualPickerVisible(true)} style={styles.manualLink} hitSlop={8}>
                  <Text style={styles.manualLinkText}>¿Tu PC no tiene un componente? Márcalo manualmente</Text>
                </TouchableOpacity>
              )}
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
      <Modal
        visible={(scanState === 'result' || scanState === 'listening' || scanState === 'thinking') && detected !== null}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.lg }}>
              <View style={styles.detectedHeader}>
                <View style={styles.detectedIcon}>
                  <Text style={{ fontSize: 40 }}>{detected?.icon}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Pill label={manualMode ? '✎ Marcado manualmente' : '✓ Detectado por IA'} tone={manualMode ? 'accent' : 'success'} />
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

              <View style={styles.chatSection}>
                <Text style={styles.specsTitle}>{manualMode ? 'Nota' : 'Pregúntale a la IA'}</Text>
                {conversacion.map((turno, i) => (
                  <View key={i} style={[styles.chatBubble, turno.rol === 'usuario' ? styles.chatBubbleUser : styles.chatBubbleIA]}>
                    <Text style={styles.chatBubbleText}>{turno.texto}</Text>
                  </View>
                ))}
                {!manualMode && scanState === 'thinking' && (
                  <View style={styles.chatThinking}>
                    <ActivityIndicator color={Colors.primary} size="small" />
                    <Text style={styles.bottomSubDark}>Pensando…</Text>
                  </View>
                )}
                {!manualMode && (
                  <TouchableOpacity
                    style={[styles.micBtn, scanState === 'listening' && styles.micBtnActive, cooldown && scanState !== 'listening' && styles.micBtnDisabled]}
                    onPress={scanState === 'listening' ? handleAskStop : handleAskStart}
                    disabled={scanState === 'thinking' || (cooldown && scanState !== 'listening')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={scanState === 'listening' ? 'stop-circle' : 'mic'} size={20} color={Colors.white} />
                    <Text style={styles.micBtnText}>
                      {scanState === 'listening' ? 'Detener y enviar' :
                       cooldown ? 'Espera un momento…' : 'Preguntar por voz'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

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

      {/* Completion sheet — se muestra al escanear las 8 piezas */}
      <Modal visible={showComplete} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.quizSheet}>
            <View style={{ alignItems: 'center', gap: Spacing.xs }}>
              <Text style={{ fontSize: 56 }}>🎉</Text>
              <Text style={styles.quizTitle}>¡PC ensamblada!</Text>
              <Text style={styles.quizQuestion}>
                Escaneaste e instalaste los {PC_COMPONENTS.length} componentes. Tu PC virtual está lista y el ensamble móvil quedó completado.
              </Text>
            </View>
            <PrimaryButton label="Seguir explorando" onPress={() => setShowComplete(false)} style={{ marginTop: Spacing.sm }} />
            <TouchableOpacity style={styles.skipBtn} onPress={handleReset}>
              <Text style={[styles.skipText, { color: Colors.error }]}>Reiniciar ensamblaje</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual picker — para equipos que físicamente no tienen alguna pieza (p. ej. GPU dedicada) */}
      <Modal visible={manualPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.specsTitle}>¿Qué componente no tiene tu equipo?</Text>
            <Text style={[styles.bottomSubDark, { marginTop: 4, marginBottom: Spacing.md }]}>
              Úsalo solo si tu PC realmente no tiene esa pieza física (por ejemplo, gráficos integrados en vez de una GPU
              dedicada). Se marcará como completada para que puedas terminar tu ensamble.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.lg }}>
              {pendientes.map(c => (
                <TouchableOpacity key={c.id} style={styles.manualOption} onPress={() => handleManualPick(c)} activeOpacity={0.85}>
                  <Text style={{ fontSize: 24 }}>{c.icon}</Text>
                  <Text style={styles.manualOptionText}>{c.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.skipBtn} onPress={() => setManualPickerVisible(false)}>
              <Text style={styles.skipText}>Cancelar</Text>
            </TouchableOpacity>
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
  shutterDisabled: { opacity: 0.4 },
  shutterInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  manualLink: { marginTop: Spacing.sm, padding: Spacing.xs },
  manualLinkText: { fontFamily: Fonts.sansSemi, fontSize: 13, color: 'rgba(255,255,255,0.82)', textAlign: 'center', textDecorationLine: 'underline' },

  manualOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  manualOptionText: { flex: 1, fontFamily: Fonts.sansSemi, fontSize: 14.5, color: Colors.text },

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

  chatSection: { marginTop: Spacing.lg, gap: Spacing.sm },
  chatBubble: { padding: Spacing.sm, borderRadius: Radius.md, maxWidth: '90%' },
  chatBubbleIA: { backgroundColor: Colors.primarySoft, alignSelf: 'flex-start' },
  chatBubbleUser: { backgroundColor: Colors.surface, alignSelf: 'flex-end', borderWidth: 1, borderColor: Colors.border },
  chatBubbleText: { fontFamily: Fonts.sans, fontSize: 13.5, color: Colors.text, lineHeight: 20 },
  chatThinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomSubDark: { fontFamily: Fonts.sans, fontSize: 13, color: Colors.textSecondary },
  micBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 12, marginTop: Spacing.xs },
  micBtnActive: { backgroundColor: Colors.error },
  micBtnDisabled: { opacity: 0.4 },
  micBtnText: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.white },

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
