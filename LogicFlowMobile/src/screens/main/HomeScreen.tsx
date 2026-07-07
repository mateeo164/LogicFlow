import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { obtenerProgreso, obtenerEstadisticas, ProgresoUsuario, Estadisticas } from '../../services/progress'
import { contarNotifsNoLeidas } from '../../services/tutor'
import { calculateXp, getLevelProgress, PC_COMPONENTS, COMPONENT_MAP } from '../../constants/components'
import { XPBar } from '../../components/XPBar'
import { StatCard } from '../../components/StatCard'
import { GradientCard } from '../../components/GradientCard'
import { SectionTitle } from '../../components/ui'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'

type IconName = React.ComponentProps<typeof Ionicons>['name']

const DAILY_TIPS = [
  'Los slots de RAM deben usarse en pares para aprovechar el Dual Channel.',
  'Siempre toca una superficie metálica antes de manipular componentes electrónicos.',
  'La pasta térmica sólo necesita ser del tamaño de un guisante, no más.',
  'El socket de la CPU tiene una orientación única — nunca fuerces el procesador.',
  'Los SSD NVMe M.2 son hasta 7× más rápidos que los SSD SATA convencionales.',
  'La certificación 80 Plus Gold asegura ≥87% de eficiencia energética en la PSU.',
  'El gabinete define el factor de forma: ATX, Micro-ATX o Mini-ITX.',
  'Una GPU moderna puede tener más de 10,000 núcleos trabajando en paralelo.',
]

const ACTIONS: { id: string; label: string; sub: string; icon: IconName; route: string; tone: string }[] = [
  { id: 'scanner', label: 'Escáner AR', sub: 'Escanea y ensambla', icon: 'scan-outline', route: '/(tabs)/scanner', tone: Colors.primary },
  { id: 'learn', label: 'Aprender', sub: 'Tarjetas y quizzes', icon: 'book-outline', route: '/(tabs)/learn', tone: Colors.success },
  { id: 'badges', label: 'Logros', sub: 'Tus insignias', icon: 'trophy-outline', route: '/(tabs)/badges', tone: Colors.secondary },
]

export function HomeScreen() {
  const { userName, userRol } = useAuth()
  const esTutor = (userRol || 'Estudiante').toLowerCase() === 'tutor'
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null)
  const [stats, setStats] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [tip] = useState(() => DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)])

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([obtenerProgreso(), obtenerEstadisticas()])
    setProgreso(p)
    setStats(s)
    setLoading(false)
    setRefreshing(false)
    if (!esTutor) { try { setNotifCount(await contarNotifsNoLeidas()) } catch {} }
  }, [esTutor])

  useEffect(() => { load() }, [load])

  const instalados = progreso?.componentes_instalados || []
  const xp = calculateXp(progreso?.simulaciones_completadas || 0, instalados)
  const { current: level, progress: levelProgress } = getLevelProgress(xp)
  const precision = stats?.precision ?? null
  const nextComponent = PC_COMPONENTS.find(c => !instalados.includes(c.id))
  const assemblyPct = Math.round((instalados.length / PC_COMPONENTS.length) * 100)

  function formatTiempo(seg: number) {
    if (seg < 60) return `${seg}s`
    if (seg < 3600) return `${Math.round(seg / 60)}m`
    return `${Math.floor(seg / 3600)}h ${Math.round((seg % 3600) / 60)}m`
  }

  function greeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Preparando tu laboratorio…</Text>
      </View>
    )
  }

  const firstName = userName.split(' ')[0]

  // Vista del docente: sin simulador ni gamificación de estudiante.
  if (esTutor) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.overline}>{greeting()}</Text>
              <Text style={styles.greeting}>{firstName}</Text>
            </View>
            {!esTutor && (
              <TouchableOpacity onPress={() => router.push('/notificaciones' as any)} activeOpacity={0.85} style={styles.bell} hitSlop={8}>
                <Ionicons name="notifications-outline" size={22} color={Colors.text} />
                {notifCount > 0 && (
                  <View style={styles.bellBadge}><Text style={styles.bellBadgeTxt}>{notifCount > 9 ? '9+' : notifCount}</Text></View>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text></View>
            </TouchableOpacity>
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/classes' as any)}
            style={({ pressed }) => [styles.hero, Shadow.lg, pressed && { transform: [{ scale: 0.99 }] }]}
          >
            <Text style={styles.heroOverline}>PANEL DEL DOCENTE</Text>
            <Text style={styles.heroTitle}>Mis clases</Text>
            <Text style={styles.heroSub}>Crea clases, comparte el código y sigue las calificaciones de tus estudiantes.</Text>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Ir a mis clases</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.textInverse} />
            </View>
          </Pressable>

          <GradientCard tone="accent" padded style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.accentDeep} />
              <Text style={styles.tipTitle}>Cómo empezar</Text>
            </View>
            <Text style={styles.tipText}>
              Crea una clase en la pestaña "Clases", comparte su código con tus estudiantes y verás aquí su avance:
              notas de ensamble, retos, logros y tiempo.
            </Text>
          </GradientCard>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>{greeting()}</Text>
            <Text style={styles.greeting}>{firstName}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Hero — continue building */}
        <Pressable
          onPress={() => router.push('/(tabs)/scanner')}
          style={({ pressed }) => [styles.hero, Shadow.lg, pressed && { transform: [{ scale: 0.99 }] }]}
        >
          <View style={styles.heroTopRow}>
            <Text style={styles.heroOverline}>TU SIMULACIÓN</Text>
            <View style={styles.heroPct}>
              <Text style={styles.heroPctText}>{assemblyPct}%</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>
            {instalados.length === 0
              ? 'Arma tu primera PC'
              : instalados.length >= PC_COMPONENTS.length
                ? 'PC completada'
                : `${nextComponent?.label ?? ''}`}
          </Text>
          <Text style={styles.heroSub}>
            {instalados.length >= PC_COMPONENTS.length
              ? `Has instalado los ${PC_COMPONENTS.length} componentes. ¡Excelente trabajo!`
              : `${instalados.length} de ${PC_COMPONENTS.length} componentes instalados`}
          </Text>
          <View style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${assemblyPct}%` }]} />
          </View>
          <View style={styles.heroCta}>
            <Text style={styles.heroCtaText}>
              {instalados.length === 0 ? 'Comenzar ahora' : 'Continuar'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.textInverse} />
          </View>
        </Pressable>

        {/* XP / level */}
        <GradientCard style={styles.xpCard}>
          <XPBar xp={xp} />
        </GradientCard>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="🧩" label="Componentes" value={`${instalados.length}/${PC_COMPONENTS.length}`} color={Colors.primary} />
          <StatCard icon="🎯" label="Precisión" value={precision !== null ? `${precision}%` : '—'} color={Colors.success} />
          <StatCard icon="🏆" label="Builds" value={progreso?.simulaciones_completadas || 0} color={Colors.accent} />
        </View>

        {/* Certificado */}
        {(() => {
          const webOk = !!progreso?.web_aprobado_at
          const appOk = !!progreso?.movil_completado_at
          const both = webOk && appOk
          return (
            <Pressable
              onPress={() => router.push('/certificate' as any)}
              style={({ pressed }) => [styles.certBanner, both && styles.certBannerReady, pressed && { transform: [{ scale: 0.99 }] }]}
            >
              <View style={styles.certIcon}>
                <Text style={{ fontSize: 24 }}>{both ? '🎓' : '🔒'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.certTitle}>{both ? 'Certificado disponible' : 'Certificado en progreso'}</Text>
                <Text style={styles.certSub}>
                  {both
                    ? 'Genera y comparte tu certificado con la foto de tu PC.'
                    : `Web ${webOk ? '✓' : '·'}  ·  App ${appOk ? '✓' : '·'} — completa ambas etapas.`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={both ? Colors.success : Colors.textMuted} />
            </Pressable>
          )
        })()}

        {/* Mis tareas */}
        <Pressable
          onPress={() => router.push('/tareas' as any)}
          style={({ pressed }) => [styles.certBanner, pressed && { transform: [{ scale: 0.99 }] }]}
        >
          <View style={styles.certIcon}><Text style={{ fontSize: 22 }}>📋</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.certTitle}>Mis tareas</Text>
            <Text style={styles.certSub}>Tareas asignadas por tus tutores.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </Pressable>

        {/* Quick actions */}
        <SectionTitle>Explorar</SectionTitle>
        <View style={styles.actionsGrid}>
          {ACTIONS.map(a => (
            <Pressable
              key={a.id}
              onPress={() => router.push(a.route as any)}
              style={({ pressed }) => [styles.actionCard, Shadow.sm, pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: a.tone + '14' }]}>
                <Ionicons name={a.icon} size={22} color={a.tone} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Text style={styles.actionSub}>{a.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/* Next component */}
        {nextComponent && (
          <>
            <SectionTitle>Siguiente componente</SectionTitle>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(tabs)/learn', params: { componentId: nextComponent.id } })}
            >
              <GradientCard style={styles.nextCard}>
                <View style={styles.nextIcon}>
                  <Text style={{ fontSize: 30 }}>{nextComponent.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextStep}>PASO {nextComponent.assemblyStep} DE {PC_COMPONENTS.length}</Text>
                  <Text style={styles.nextName}>{nextComponent.label}</Text>
                  <Text style={styles.nextDesc} numberOfLines={2}>{nextComponent.shortDesc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </GradientCard>
            </TouchableOpacity>
          </>
        )}

        {/* Tip of the day */}
        <GradientCard tone="accent" padded style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={18} color={Colors.accentDeep} />
            <Text style={styles.tipTitle}>Dato del día</Text>
          </View>
          <Text style={styles.tipText}>{tip}</Text>
        </GradientCard>

        {/* Performance */}
        <SectionTitle>Tu rendimiento</SectionTitle>
        <View style={styles.perfGrid}>
          <PerfCard icon="time-outline" label="Tiempo total" value={formatTiempo(progreso?.tiempo_total_segundos || 0)} color={Colors.primary} />
          <PerfCard icon="checkmark-circle-outline" label="Aciertos" value={`${stats?.aciertos || 0}`} color={Colors.success} />
          <PerfCard icon="close-circle-outline" label="Errores" value={`${stats?.errores_pieza || 0}`} color={Colors.error} />
          <PerfCard icon="flash-outline" label="Promedio" value={stats?.tiempo_promedio ? `${stats.tiempo_promedio}s` : '—'} color={Colors.accent} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function PerfCard({ icon, label, value, color }: { icon: IconName; label: string; value: string; color: string }) {
  return (
    <View style={styles.perfCard}>
      <View style={styles.perfTop}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.perfLabel}>{label}</Text>
      </View>
      <Text style={[styles.perfValue, { color }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: Spacing.md },
  loadingText: { ...Typography.caption },
  scroll: { padding: Spacing.md, paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  overline: { ...Typography.overline },
  greeting: { ...Typography.display, marginTop: 2 },
  avatar: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: Colors.primaryDeep,
    justifyContent: 'center', alignItems: 'center',
    ...Shadow.md,
  },
  avatarText: { fontFamily: Fonts.serif, fontSize: 20, color: Colors.textInverse },

  bell: {
    width: 44, height: 44, borderRadius: 14, marginRight: Spacing.sm,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: 9, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  bellBadgeTxt: { fontFamily: Fonts.sansBold, fontSize: 10, color: Colors.white },

  hero: {
    backgroundColor: Colors.primaryDeep,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  heroOverline: { fontFamily: Fonts.sansSemi, fontSize: 11, letterSpacing: 1.4, color: 'rgba(250,250,249,0.6)' },
  heroPct: { backgroundColor: 'rgba(217,119,6,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  heroPctText: { fontFamily: Fonts.sansBold, fontSize: 12, color: Colors.accentBright },
  heroTitle: { fontFamily: Fonts.serif, fontSize: 25, color: Colors.textInverse, letterSpacing: -0.4 },
  heroSub: { fontFamily: Fonts.sans, fontSize: 13.5, color: 'rgba(250,250,249,0.72)', marginTop: 4 },
  heroTrack: { height: 7, backgroundColor: 'rgba(250,250,249,0.16)', borderRadius: Radius.full, overflow: 'hidden', marginTop: Spacing.md },
  heroFill: { height: '100%', backgroundColor: Colors.accentBright, borderRadius: Radius.full },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md },
  heroCtaText: { fontFamily: Fonts.sansBold, fontSize: 14, color: Colors.textInverse },

  xpCard: { marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },

  certBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  certBannerReady: { borderColor: Colors.success, backgroundColor: Colors.successSoft },
  certIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: Colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  certTitle: { fontFamily: Fonts.sansBold, fontSize: 15, color: Colors.text },
  certSub: { ...Typography.caption, marginTop: 2 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  actionCard: {
    width: '48.5%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 4,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  actionLabel: { fontFamily: Fonts.sansBold, fontSize: 15, color: Colors.text },
  actionSub: { ...Typography.small },

  nextCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  nextIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  nextStep: { ...Typography.overline, color: Colors.accent, marginBottom: 3 },
  nextName: { fontFamily: Fonts.sansBold, fontSize: 15.5, color: Colors.text },
  nextDesc: { ...Typography.caption, marginTop: 2 },

  tipCard: { marginBottom: Spacing.lg },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  tipTitle: { fontFamily: Fonts.sansBold, fontSize: 14, color: Colors.accentDeep },
  tipText: { fontFamily: Fonts.sans, fontSize: 14, color: '#6b4416', lineHeight: 21 },

  perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  perfCard: {
    width: '48.5%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 8,
    ...Shadow.sm,
  },
  perfTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  perfLabel: { ...Typography.caption },
  perfValue: { fontFamily: Fonts.serif, fontSize: 24, letterSpacing: -0.4 },
})
