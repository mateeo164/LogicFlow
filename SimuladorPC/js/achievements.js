

export const LEVELS = [
  { name: 'Novato',        minXp: 0,   color: '#94a3b8', icon: '🌱' },
  { name: 'Aprendiz',      minXp: 100, color: '#3b82f6', icon: '🔧' },
  { name: 'Técnico',       minXp: 300, color: '#06b6d4', icon: '⚡' },
  { name: 'Experto',       minXp: 600, color: '#8b5cf6', icon: '🧠' },
  { name: 'Master Builder', minXp: 1000, color: '#f59e0b', icon: '🏆' }
]

export const XP = {
  COMPONENT_INSTALLED: 100,
  SIMULATION_COMPLETED: 200,
  PERFECT_RUN: 100,
  FAST_COMPONENT: 50
}

export function getLevel(xp = 0) {
  let current = LEVELS[0]
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl
    else break
  }
  return current
}

export function getNextLevel(xp = 0) {
  for (const lvl of LEVELS) {
    if (xp < lvl.minXp) return lvl
  }
  return null
}

export function getXpToNextLevel(xp = 0) {
  const next = getNextLevel(xp)
  if (!next) return { current: xp, target: xp, remaining: 0 }
  const currentLevel = getLevel(xp)
  const range = next.minXp - currentLevel.minXp
  const progress = xp - currentLevel.minXp
  return {
    current: progress,
    target: range,
    remaining: next.minXp - xp,
    nextLevelName: next.name
  }
}

export function calculateTotalXp(progreso = {}, stats = {}) {
  const instalados = progreso?.componentes_instalados || []
  const simulaciones = progreso?.simulaciones_completadas || 0
  const aciertos = stats?.aciertos || 0
  const errores = stats?.errores_pieza || 0
  const tiempoPromedio = stats?.tiempo_promedio || 0

  let xp = instalados.length * XP.COMPONENT_INSTALLED
  xp += simulaciones * XP.SIMULATION_COMPLETED

  if (simulaciones > 0 && errores === 0 && aciertos > 0) {
    xp += XP.PERFECT_RUN
  }
  if (tiempoPromedio > 0 && tiempoPromedio < 45) {
    xp += XP.FAST_COMPONENT
  }
  return Math.floor(xp)
}

export const BADGES = [
  {
    id: 'primera_pc',
    title: 'Primera PC',
    description: 'Completaste tu primera simulación de ensamblaje.',
    icon: '🖥️',
    condition: (p, s) => (p?.simulaciones_completadas || 0) >= 1
  },
  {
    id: 'sin_errores',
    title: 'Mano firme',
    description: 'Completaste una simulación sin errores de pieza.',
    icon: '✨',
    condition: (p, s) => (p?.simulaciones_completadas || 0) >= 1 && (s?.errores_pieza || 0) === 0 && (s?.aciertos || 0) > 0
  },
  {
    id: 'rapido',
    title: 'Velocista',
    description: 'Tu tiempo promedio por componente es menor a 45s.',
    icon: '⚡',
    condition: (p, s) => (s?.tiempo_promedio || 999) < 45 && (s?.aciertos || 0) > 0
  },
  {
    id: 'tecnico',
    title: 'Técnico certificado',
    description: 'Alcanzaste el nivel Técnico.',
    icon: '🔧',
    condition: (p, s, xp) => getLevel(xp).minXp >= LEVELS.find(l => l.name === 'Técnico').minXp
  },
  {
    id: 'experto',
    title: 'Experto en hardware',
    description: 'Alcanzaste el nivel Experto.',
    icon: '🧠',
    condition: (p, s, xp) => getLevel(xp).minXp >= LEVELS.find(l => l.name === 'Experto').minXp
  },
  {
    id: 'master_builder',
    title: 'Master Builder',
    description: 'Alcanzaste el nivel máximo.',
    icon: '🏆',
    condition: (p, s, xp) => getLevel(xp).minXp >= LEVELS.find(l => l.name === 'Master Builder').minXp
  },
  {
    id: 'componente_estrella',
    title: 'Componente estrella',
    description: 'Instalaste todos los componentes del laboratorio.',
    icon: '🌟',
    condition: (p, s) => (p?.componentes_instalados || []).length >= 8
  },
  {
    id: ' persistente',
    title: 'Persistente',
    description: 'Completaste 5 simulaciones.',
    icon: '🔄',
    condition: (p, s) => (p?.simulaciones_completadas || 0) >= 5
  }
]

export function getBadges(progreso = {}, stats = {}, xp = 0) {
  return BADGES.map(badge => ({
    ...badge,
    unlocked: badge.condition(progreso, stats, xp)
  }))
}

export function getRecentBadges(progreso = {}, stats = {}, xp = 0, limit = 3) {
  return getBadges(progreso, stats, xp)
    .filter(b => b.unlocked)
    .slice(0, limit)
}

export function getProgressSummary(progreso = {}, stats = {}) {
  const xp = calculateTotalXp(progreso, stats)
  const level = getLevel(xp)
  const xpInfo = getXpToNextLevel(xp)
  const badges = getBadges(progreso, stats, xp)
  const unlockedCount = badges.filter(b => b.unlocked).length

  return {
    xp,
    level,
    xpInfo,
    badges,
    unlockedCount,
    totalBadges: badges.length,
    recentBadges: getRecentBadges(progreso, stats, xp)
  }
}

export function formatXp(xp) {
  return `${xp} XP`
}
