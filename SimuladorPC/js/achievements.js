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
    condition: (p, s) => (p?.componentes_instalados || []).length >= 11
  },
  {
    id: 'persistente',
    title: 'Persistente',
    description: 'Completaste 5 simulaciones.',
    icon: '🔄',
    condition: (p, s) => (p?.simulaciones_completadas || 0) >= 5
  },
  {
    id: 'primer_paso',
    title: 'Primer tornillo',
    description: 'Instalaste tu primer componente del PC.',
    icon: '🔩',
    condition: (p, s) => (p?.componentes_instalados || []).length >= 1
  },
  {
    id: 'medio_camino',
    title: 'A mitad de camino',
    description: 'Instalaste más de la mitad de los componentes del laboratorio.',
    icon: '🧱',
    condition: (p, s) => (p?.componentes_instalados || []).length >= 6
  },
  {
    id: 'precision_alta',
    title: 'Precisión de cirujano',
    description: 'Alcanzaste 90% de precisión o más en tus ensambles.',
    icon: '🎯',
    condition: (p, s) => (s?.aciertos || 0) > 0 && (s?.precision ?? 0) >= 90
  },
  {
    id: 'sin_demoras',
    title: 'Sin titubeos',
    description: 'Completaste una simulación sin ninguna demora registrada.',
    icon: '🚀',
    condition: (p, s) => (p?.simulaciones_completadas || 0) >= 1 && (s?.demoras || 0) === 0 && (s?.aciertos || 0) > 0
  },
  {
    id: 'veterano',
    title: 'Veterano del laboratorio',
    description: 'Completaste 10 simulaciones de ensamblaje.',
    icon: '🎖️',
    condition: (p, s) => (p?.simulaciones_completadas || 0) >= 10
  },
  {
    id: 'maratonista',
    title: 'Maratonista',
    description: 'Acumulaste más de 1 hora de práctica en el laboratorio 3D.',
    icon: '⏳',
    condition: (p, s) => (p?.tiempo_total_segundos || 0) >= 3600
  },
  {
    id: 'comprension_solida',
    title: 'Mente teórica',
    description: 'Obtuviste 80% o más en las preguntas de comprensión.',
    icon: '📚',
    condition: (p, s) => (p?.comprension_pct || 0) >= 80
  },
  {
    id: 'ensamble_aprobado',
    title: 'Ensamble aprobado',
    description: 'Aprobaste el ensamble del laboratorio 3D.',
    icon: '✅',
    condition: (p, s) => !!p?.web_aprobado_at
  },
  {
    id: 'certificado_completo',
    title: 'Certificado LogicFlow',
    description: 'Completaste el ensamble web y la instalación real guiada en la app móvil.',
    icon: '📜',
    condition: (p, s) => !!p?.web_aprobado_at && !!p?.movil_completado_at
  }
]

export const GRANULAR_LOGROS = [
  { id: 'cpu_alineado',    title: 'Pulso de cirujano',   description: 'Alineaste y colocaste el procesador sin un solo error.', icon: '🎯' },
  { id: 'cooler_montado',  title: 'Maestro térmico',     description: 'Montaste el disipador y aplicaste la pasta sin errores.', icon: '❄️' },
  { id: 'ram_dual',        title: 'Dual channel',        description: 'Insertaste la RAM en los slots correctos sin errores.',   icon: '📊' },
  { id: 'mb_montada',      title: 'Base firme',          description: 'Montaste la placa base sin errores.',                     icon: '🧩' },
  { id: 'gpu_instalada',   title: 'Potencia gráfica',    description: 'Aseguraste y alimentaste la GPU sin errores.',            icon: '🎮' },
  { id: 'cables_maestro',  title: 'Domador de cables',   description: 'Conectaste todos los cables de poder sin equivocarte.',   icon: '🔌' },
  { id: 'ensamble_perfecto', title: 'Ensamble impecable', description: 'Completaste un procedimiento guiado con cero errores.',   icon: '💠' }
]

export const PROC_LOGRO = {
  cpu:    'cpu_alineado',
  cooler: 'cooler_montado',
  ram:    'ram_dual',
  mb:     'mb_montada',
  gpu:    'gpu_instalada',
  power:  'cables_maestro'
}

export const LOGRO_BONO_UNIT = 0.05
export const LOGRO_BONO_MAX = 0.5

export function bonoPorLogros(cantidad = 0) {
  return Math.min(LOGRO_BONO_MAX, Math.max(0, cantidad) * LOGRO_BONO_UNIT)
}

export function notaConBono(notaBase = 0, cantidadLogros = 0) {
  return Math.min(10, Math.max(0, notaBase) + bonoPorLogros(cantidadLogros))
}

export function getBadges(progreso = {}, stats = {}, xp = 0, unlockedLogroIds = []) {
  const set = new Set(unlockedLogroIds)
  const computados = BADGES.map(badge => ({
    ...badge,
    unlocked: badge.condition(progreso, stats, xp)
  }))
  const granulares = GRANULAR_LOGROS.map(l => ({
    ...l,
    unlocked: set.has(l.id)
  }))
  return [...computados, ...granulares]
}

export function getProgressSummary(progreso = {}, stats = {}, unlockedLogroIds = []) {
  const xp = calculateTotalXp(progreso, stats)
  const level = getLevel(xp)
  const xpInfo = getXpToNextLevel(xp)
  const badges = getBadges(progreso, stats, xp, unlockedLogroIds)
  const unlocked = badges.filter(b => b.unlocked)
  const unlockedCount = unlocked.length

  return {
    xp,
    level,
    xpInfo,
    badges,
    unlockedCount,
    totalBadges: badges.length,
    recentBadges: unlocked.slice(0, 3),
    bono: bonoPorLogros(unlockedCount)
  }
}

export function formatXp(xp) {
  return `${xp} XP`
}
