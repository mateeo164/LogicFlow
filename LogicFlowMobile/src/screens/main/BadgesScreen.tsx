import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { obtenerProgreso, obtenerEstadisticas, ProgresoUsuario, Estadisticas } from '../../services/progress'
import { obtenerLogrosUsuario, otorgarLogros } from '../../services/logros'
import { calculateXp, getLevelProgress, LEVELS, GRANULAR_LOGROS, bonoPorLogros } from '../../constants/components'
import { XPBar } from '../../components/XPBar'
import { GradientCard } from '../../components/GradientCard'
import { SectionTitle } from '../../components/ui'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  xpReward: number
}

function computeBadges(p: ProgresoUsuario | null, s: Estadisticas | null): Badge[] {
  const instalados = p?.componentes_instalados || []
  const simulaciones = p?.simulaciones_completadas || 0
  const aciertos = s?.aciertos || 0
  const errores = s?.errores_pieza || 0
  const tiempoPromedio = s?.tiempo_promedio || 0
  const xp = calculateXp(simulaciones, instalados)
  const { current: { name: levelName } } = getLevelProgress(xp)

  return [
    { id: 'primera_pc', name: 'Primera PC', description: 'Completa tu primera simulación de ensamblaje.', icon: '🖥️', unlocked: simulaciones >= 1, xpReward: 200 },
    { id: 'sin_errores', name: 'Precisión perfecta', description: 'Instala componentes sin cometer ningún error de pieza.', icon: '✨', unlocked: errores === 0 && aciertos > 0, xpReward: 150 },
    { id: 'rapido', name: 'Flash Builder', description: 'Mantén un tiempo promedio menor a 45 segundos por componente.', icon: '⚡', unlocked: tiempoPromedio > 0 && tiempoPromedio < 45, xpReward: 150 },
    { id: 'tecnico', name: 'Técnico Certificado', description: 'Alcanza el nivel Técnico (300 XP).', icon: '🔧', unlocked: ['Técnico', 'Experto', 'Master Builder'].includes(levelName), xpReward: 100 },
    { id: 'experto', name: 'Experto en Hardware', description: 'Alcanza el nivel Experto (600 XP).', icon: '🧠', unlocked: ['Experto', 'Master Builder'].includes(levelName), xpReward: 200 },
    { id: 'master_builder', name: 'Master Builder', description: 'Alcanza el nivel máximo (1000 XP). El pináculo del ensamblaje.', icon: '👑', unlocked: levelName === 'Master Builder', xpReward: 500 },
    { id: 'curioso', name: 'Curioso Digital', description: 'Aprende los 8 componentes en el módulo de aprendizaje.', icon: '📚', unlocked: instalados.length >= 8, xpReward: 100 },
    { id: 'perseverante', name: 'Perseverante', description: 'Completa 3 simulaciones de ensamblaje.', icon: '🏆', unlocked: simulaciones >= 3, xpReward: 300 },
  ]
}

// Logros granulares persistidos en BD (escáner, quizzes, instalación real).
function granularBadges(logros: string[]): Badge[] {
  const set = new Set(logros)
  return GRANULAR_LOGROS.map(l => ({
    id: l.id, name: l.title, description: l.description, icon: l.icon,
    unlocked: set.has(l.id), xpReward: 50,
  }))
}

export function BadgesScreen() {
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null)
  const [stats, setStats] = useState<Estadisticas | null>(null)
  const [logros, setLogros] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([obtenerProgreso(), obtenerEstadisticas(), obtenerLogrosUsuario()]).then(([p, s, l]) => {
      setProgreso(p)
      setStats(s)
      setLogros(l)
      setLoading(false)

      // Persistir los logros calculados que ya están desbloqueados, para que
      // cuenten en el bono de nota y queden en el historial del usuario.
      const computados = computeBadges(p, s).filter(b => b.unlocked).map(b => b.id)
      const nuevos = computados.filter(id => !l.includes(id))
      if (nuevos.length) {
        otorgarLogros(nuevos, 'badges')
        setLogros(prev => Array.from(new Set([...prev, ...nuevos])))
      }
    })
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    )
  }

  const instalados = progreso?.componentes_instalados || []
  const xp = calculateXp(progreso?.simulaciones_completadas || 0, instalados)
  const badges = [...computeBadges(progreso, stats), ...granularBadges(logros)]
  const unlocked = badges.filter(b => b.unlocked)
  const locked = badges.filter(b => !b.unlocked)
  const bono = bonoPorLogros(unlocked.length)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={Typography.overline}>COLECCIÓN</Text>
          <Text style={Typography.h1}>Mis logros</Text>
          <Text style={styles.headerSub}>{unlocked.length} de {badges.length} insignias · bono de nota +{bono.toFixed(2)}</Text>
        </View>

        <GradientCard style={{ marginBottom: Spacing.lg }}>
          <XPBar xp={xp} />
        </GradientCard>

        {/* Level map */}
        <SectionTitle>Mapa de niveles</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }} contentContainerStyle={{ paddingVertical: 4 }}>
          <View style={styles.levelMap}>
            {LEVELS.map((level, idx) => {
              const reached = xp >= level.minXp
              const lineActive = reached && idx < LEVELS.length - 1 && xp >= LEVELS[idx + 1].minXp
              return (
                <View key={level.name} style={styles.levelNode}>
                  {idx < LEVELS.length - 1 && (
                    <View style={[styles.levelConnector, lineActive && { backgroundColor: level.color }]} />
                  )}
                  <View style={[
                    styles.levelCircle,
                    { borderColor: reached ? level.color : Colors.borderStrong, backgroundColor: reached ? level.color + '18' : Colors.surface },
                  ]}>
                    <Text style={{ fontSize: 24, opacity: reached ? 1 : 0.4 }}>{level.icon}</Text>
                  </View>
                  <Text style={[styles.levelName, reached && { color: level.color }]}>{level.name}</Text>
                  <Text style={styles.levelXp}>{level.minXp} XP</Text>
                </View>
              )
            })}
          </View>
        </ScrollView>

        {unlocked.length > 0 && (
          <>
            <SectionTitle>Desbloqueados · {unlocked.length}</SectionTitle>
            <View style={styles.grid}>
              {unlocked.map(badge => (
                <View key={badge.id} style={[styles.badgeCard, Shadow.sm]}>
                  <View style={[styles.badgeIconWrap, { backgroundColor: Colors.accentSoft }]}>
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDesc}>{badge.description}</Text>
                  <View style={styles.xpReward}>
                    <Text style={styles.xpRewardText}>+{badge.xpReward} XP</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {locked.length > 0 && (
          <>
            <SectionTitle style={{ marginTop: Spacing.lg }}>Por desbloquear · {locked.length}</SectionTitle>
            <View style={styles.grid}>
              {locked.map(badge => (
                <View key={badge.id} style={[styles.badgeCard, styles.badgeLocked]}>
                  <View style={[styles.badgeIconWrap, { backgroundColor: Colors.surfaceSunken }]}>
                    <Text style={[styles.badgeIcon, { opacity: 0.35 }]}>{badge.icon}</Text>
                    <View style={styles.lockChip}>
                      <Ionicons name="lock-closed" size={11} color={Colors.textMuted} />
                    </View>
                  </View>
                  <Text style={[styles.badgeName, { color: Colors.textMuted }]}>{badge.name}</Text>
                  <Text style={styles.badgeDesc}>{badge.description}</Text>
                  <View style={[styles.xpReward, { backgroundColor: Colors.surfaceSunken }]}>
                    <Text style={[styles.xpRewardText, { color: Colors.textMuted }]}>+{badge.xpReward} XP</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {unlocked.length === 0 && (
          <GradientCard tone="navy" style={{ marginTop: Spacing.md, alignItems: 'center' }}>
            <Text style={{ fontSize: 44 }}>🎯</Text>
            <Text style={styles.emptyTitle}>¡Comienza tu camino!</Text>
            <Text style={styles.emptyText}>
              Completa tu primera simulación de ensamblaje para desbloquear tu primera insignia.
            </Text>
          </GradientCard>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 120 },
  header: { marginBottom: Spacing.lg, gap: 2 },
  headerSub: { ...Typography.caption, marginTop: 4 },

  levelMap: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4 },
  levelNode: { alignItems: 'center', width: 86 },
  levelCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: Colors.surface },
  levelName: { fontFamily: Fonts.sansSemi, fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  levelXp: { ...Typography.small, textAlign: 'center', marginTop: 1 },
  levelConnector: { position: 'absolute', right: 0, top: 28, width: 44, height: 2.5, backgroundColor: Colors.border },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badgeCard: {
    width: '48.5%', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
  },
  badgeLocked: { backgroundColor: Colors.surfaceAlt },
  badgeIconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  badgeIcon: { fontSize: 30 },
  lockChip: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  badgeName: { fontFamily: Fonts.sansBold, fontSize: 13.5, color: Colors.text, textAlign: 'center' },
  badgeDesc: { ...Typography.small, textAlign: 'center', lineHeight: 15 },
  xpReward: { backgroundColor: Colors.accentSoft, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  xpRewardText: { fontFamily: Fonts.sansBold, fontSize: 11, color: Colors.accentDeep },

  emptyTitle: { ...Typography.h2, textAlign: 'center', marginTop: Spacing.sm },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },
})
