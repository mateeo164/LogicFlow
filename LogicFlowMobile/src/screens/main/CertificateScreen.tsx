import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Alert, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { makeImageFromView, ImageFormat } from '@shopify/react-native-skia'
import { useAuth } from '../../hooks/useAuth'
import { obtenerProgreso, ProgresoUsuario } from '../../services/progress'
import {
  obtenerLogrosUsuario, obtenerUrlFirmada, subirFoto,
  guardarCertificado, obtenerCertificado, base64ToBytes,
} from '../../services/logros'
import { notaConBono } from '../../constants/components'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'
import { PrimaryButton } from '../../components/PrimaryButton'
import { GradientCard } from '../../components/GradientCard'

type Estado = 'loading' | 'locked' | 'capture' | 'ready'

function formatTiempo(seg: number) {
  if (!seg || seg < 60) return `${seg || 0} s`
  if (seg < 3600) return `${Math.round(seg / 60)} min`
  const h = Math.floor(seg / 3600)
  const m = Math.round((seg % 3600) / 60)
  return m ? `${h} h ${m} min` : `${h} h`
}

export function CertificateScreen() {
  const { userName, userInstitucion } = useAuth()
  const [permission, requestPermission] = useCameraPermissions()
  const [estado, setEstado] = useState<Estado>('loading')
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null)
  const [logros, setLogros] = useState<string[]>([])
  const [simUrl, setSimUrl] = useState<string | null>(null)
  const [realUri, setRealUri] = useState<string | null>(null)
  const [realPath, setRealPath] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)

  const cameraRef = useRef<CameraView>(null)
  const certRef = useRef<View>(null)

  const notaFinal = notaConBono(Number(progreso?.nota_web) || 0, logros.length)
  const tiempoTotal = progreso?.tiempo_total_segundos || 0

  useEffect(() => {
    (async () => {
      const [p, l, cert] = await Promise.all([
        obtenerProgreso(), obtenerLogrosUsuario(), obtenerCertificado(),
      ])
      setProgreso(p)
      setLogros(l)

      const webOk = !!p?.web_aprobado_at
      const appOk = !!p?.movil_completado_at
      if (!webOk || !appOk) { setEstado('locked'); return }

      setSimUrl(await obtenerUrlFirmada(p?.foto_simulador_path))

      if (cert?.foto_real_path) {
        setRealPath(cert.foto_real_path)
        setRealUri(await obtenerUrlFirmada(cert.foto_real_path))
        setEstado('ready')
      } else {
        setEstado('capture')
      }
    })()
  }, [])

  async function handleCapture() {
    if (!cameraRef.current) return
    setSaving(true)
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 })
      if (!photo?.base64) throw new Error('Sin imagen')
      setRealUri(photo.uri)
      const path = await subirFoto('real.jpg', photo.base64, 'image/jpeg')
      setRealPath(path)
      setEstado('ready')
      // Registrar el certificado en la BD.
      await guardarCertificado({
        tiempo_total_segundos: tiempoTotal,
        nota_web: Number(progreso?.nota_web) || null,
        foto_simulador_path: progreso?.foto_simulador_path || null,
        foto_real_path: path,
        logros_total: logros.length,
      })
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    if (!certRef.current) return
    setSharing(true)
    try {
      const snapshot = await makeImageFromView(certRef)
      if (!snapshot) throw new Error('No se pudo capturar el certificado')
      const b64 = snapshot.encodeToBase64(ImageFormat.PNG, 100)
      const file = new File(Paths.cache, 'certificado-logicflow.png')
      try { if (file.exists) file.delete() } catch {}
      file.create()
      file.write(base64ToBytes(b64))
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: 'Mi certificado LogicFlow' })
      } else {
        Alert.alert('Certificado guardado', 'Tu certificado se generó correctamente.')
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar la imagen para compartir.')
    } finally {
      setSharing(false)
    }
  }

  // -------- Loading --------
  if (estado === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Preparando tu certificado…</Text>
      </View>
    )
  }

  // -------- Bloqueado --------
  if (estado === 'locked') {
    const webOk = !!progreso?.web_aprobado_at
    const appOk = !!progreso?.movil_completado_at
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.lockHero}>
            <Text style={{ fontSize: 60 }}>🔒</Text>
            <Text style={styles.lockTitle}>Certificado por desbloquear</Text>
            <Text style={styles.lockSub}>
              Completa las dos etapas del ecosistema LogicFlow para emitir tu certificado con la foto de tu PC.
            </Text>
          </View>

          <GradientCard style={{ width: '100%', gap: Spacing.md }}>
            <Requisito ok={webOk} titulo="Ensamble 3D aprobado (web)"
              detalle={webOk ? '✓ Aprobado en el simulador' : 'Aprueba el ensamble en el simulador web (≥ 7/10).'} />
            <Requisito ok={appOk} titulo="Instalación real (app móvil)"
              detalle={appOk ? '✓ Completada' : 'Escanea todos los componentes con el escáner AR para completar el ensamble.'} />
          </GradientCard>

          {!appOk && (
            <PrimaryButton label="Ir al escáner" icon="📷" onPress={() => router.push('/(tabs)/scanner')} style={{ width: '100%', marginTop: Spacing.lg }} />
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // -------- Captura de la foto real --------
  if (estado === 'capture') {
    if (!permission) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
    if (!permission.granted) {
      return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Header onBack={() => router.back()} />
          <View style={styles.permBox}>
            <View style={styles.permIcon}><Ionicons name="camera-outline" size={44} color={Colors.primary} /></View>
            <Text style={styles.lockTitle}>Foto de tu PC real</Text>
            <Text style={styles.lockSub}>
              Tu certificado incluye una foto de la PC que ensamblaste en la vida real. Autoriza la cámara para tomarla.
            </Text>
            <PrimaryButton label="Permitir cámara" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
          </View>
        </SafeAreaView>
      )
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <SafeAreaView style={styles.cameraUi} edges={['top', 'bottom']}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.glassBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>Foto de tu PC real</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.cameraBottom}>
            <Text style={styles.cameraHint}>Encuadra la PC que armaste y toma la foto para tu certificado.</Text>
            <Pressable onPress={handleCapture} disabled={saving} style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.95 }] }]}>
              <View style={styles.shutterInner}>
                {saving ? <ActivityIndicator color={Colors.primaryDeep} /> : <Ionicons name="camera" size={30} color={Colors.primaryDeep} />}
              </View>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // -------- Certificado listo --------
  const fecha = new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header onBack={() => router.back()} title="Tu certificado" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Certificado capturable */}
        <View ref={certRef} collapsable={false} style={styles.certCard}>
          <View style={styles.certTopBar} />
          <View style={styles.certHeader}>
            <Text style={styles.certBrand}>LogicFlow</Text>
            <Text style={styles.certKicker}>CERTIFICADO DE ENSAMBLE DE PC</Text>
          </View>

          <Text style={styles.certLead}>Se otorga a</Text>
          <Text style={styles.certName}>{userName}</Text>
          {!!userInstitucion && <Text style={styles.certInst}>{userInstitucion}</Text>}
          <Text style={styles.certBody}>
            por completar el ecosistema LogicFlow: ensamblar una PC en el simulador 3D
            y realizar la instalación real guiada, demostrando dominio del hardware.
          </Text>

          <View style={styles.photosRow}>
            <View style={styles.photoBox}>
              {simUrl
                ? <Image source={{ uri: simUrl }} style={styles.photo} resizeMode="cover" />
                : <View style={[styles.photo, styles.photoPlaceholder]}><Text style={styles.photoPlaceholderTxt}>Simulador</Text></View>}
              <Text style={styles.photoLabel}>PC en el simulador</Text>
            </View>
            <View style={styles.photoBox}>
              {realUri
                ? <Image source={{ uri: realUri }} style={styles.photo} resizeMode="cover" />
                : <View style={[styles.photo, styles.photoPlaceholder]}><Text style={styles.photoPlaceholderTxt}>Real</Text></View>}
              <Text style={styles.photoLabel}>PC en la vida real</Text>
            </View>
          </View>

          <View style={styles.certStats}>
            <CertStat valor={`${notaFinal.toFixed(1)}/10`} label="Nota final" />
            <CertStat valor={formatTiempo(tiempoTotal)} label="Tiempo en el ecosistema" />
            <CertStat valor={`${logros.length}`} label="Logros" />
          </View>

          <View style={styles.certFooter}>
            <View>
              <Text style={styles.certSeal}>✔ Emitido</Text>
              <Text style={styles.certDate}>{fecha}</Text>
            </View>
            <Text style={styles.certUce}>Universidad Central del Ecuador</Text>
          </View>
        </View>

        <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          <PrimaryButton label={sharing ? 'Generando…' : 'Compartir certificado'} icon="📤" onPress={handleShare} loading={sharing} />
          <TouchableOpacity style={styles.retake} onPress={() => setEstado('capture')}>
            <Ionicons name="camera-reverse-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.retakeTxt}>Volver a tomar la foto real</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Header({ onBack, title = 'Certificado' }: { onBack: () => void; title?: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={8} style={styles.headerBtn}>
        <Ionicons name="chevron-back" size={22} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 22 }} />
    </View>
  )
}

function Requisito({ ok, titulo, detalle }: { ok: boolean; titulo: string; detalle: string }) {
  return (
    <View style={styles.reqRow}>
      <View style={[styles.reqDot, ok && styles.reqDotOk]}>
        {ok && <Ionicons name="checkmark" size={14} color={Colors.white} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.reqTitle, ok && { color: Colors.success }]}>{titulo}</Text>
        <Text style={styles.reqDetalle}>{detalle}</Text>
      </View>
    </View>
  )
}

function CertStat({ valor, label }: { valor: string; label: string }) {
  return (
    <View style={styles.certStat}>
      <Text style={styles.certStatValor}>{valor}</Text>
      <Text style={styles.certStatLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: Spacing.md },
  loadingText: { ...Typography.caption },
  scroll: { padding: Spacing.md, paddingBottom: 140, alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerBtn: { width: 22 },
  headerTitle: { ...Typography.h2 },

  lockHero: { alignItems: 'center', gap: Spacing.xs, marginVertical: Spacing.lg },
  lockTitle: { ...Typography.h1, textAlign: 'center', marginTop: Spacing.sm },
  lockSub: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 23, marginTop: 4 },

  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  reqDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  reqDotOk: { backgroundColor: Colors.success, borderColor: Colors.success },
  reqTitle: { fontFamily: Fonts.sansBold, fontSize: 15, color: Colors.text },
  reqDetalle: { ...Typography.caption, marginTop: 2 },

  permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  permIcon: { width: 88, height: 88, borderRadius: 28, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },

  cameraContainer: { flex: 1, backgroundColor: '#0c0a09' },
  cameraUi: { flex: 1, justifyContent: 'space-between' },
  cameraHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  glassBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  cameraTitle: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.white },
  cameraBottom: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.md },
  cameraHint: { fontFamily: Fonts.sans, fontSize: 13.5, color: 'rgba(255,255,255,0.82)', textAlign: 'center' },
  shutter: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },

  // Certificado
  certCard: {
    width: '100%', backgroundColor: '#fbfaf7', borderRadius: Radius.lg, borderWidth: 1, borderColor: '#e6e0d3',
    padding: Spacing.lg, overflow: 'hidden', ...Shadow.md,
  },
  certTopBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: Colors.primaryDeep },
  certHeader: { alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.md },
  certBrand: { fontFamily: Fonts.serif, fontSize: 26, color: Colors.primaryDeep },
  certKicker: { fontFamily: Fonts.sansBold, fontSize: 10.5, letterSpacing: 2, color: Colors.accentDeep, marginTop: 2 },
  certLead: { fontFamily: Fonts.sans, fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  certName: { fontFamily: Fonts.serif, fontSize: 24, color: Colors.text, textAlign: 'center', marginTop: 2 },
  certInst: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 1 },
  certBody: { fontFamily: Fonts.sans, fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: Spacing.sm, paddingHorizontal: Spacing.xs },

  photosRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  photoBox: { flex: 1, alignItems: 'center', gap: 5 },
  photo: { width: '100%', height: 108, borderRadius: Radius.md, backgroundColor: Colors.surfaceSunken, borderWidth: 1, borderColor: '#e6e0d3' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderTxt: { ...Typography.caption },
  photoLabel: { fontFamily: Fonts.sansSemi, fontSize: 11, color: Colors.textSecondary },

  certStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: '#e6e0d3' },
  certStat: { alignItems: 'center', flex: 1 },
  certStatValor: { fontFamily: Fonts.serif, fontSize: 20, color: Colors.primaryDeep },
  certStatLabel: { fontFamily: Fonts.sans, fontSize: 10.5, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },

  certFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Spacing.lg },
  certSeal: { fontFamily: Fonts.sansBold, fontSize: 13, color: Colors.success },
  certDate: { ...Typography.caption },
  certUce: { fontFamily: Fonts.sans, fontSize: 10, color: Colors.textMuted, maxWidth: 130, textAlign: 'right' },

  retake: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: Spacing.sm },
  retakeTxt: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.textSecondary },
})
