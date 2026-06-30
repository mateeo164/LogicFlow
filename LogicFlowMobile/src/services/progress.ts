import { supabase } from './supabase'

export interface ProgresoUsuario {
  id?: string
  user_id?: string
  componentes_instalados: string[]
  paso_actual: number
  total_componentes: number
  simulaciones_completadas: number
  ultimo_componente: string | null
  tiempo_total_segundos: number
  completed_at: string | null
  updated_at?: string
}

export interface Estadisticas {
  aciertos: number
  errores_pieza: number
  demoras: number
  total_intentos: number
  precision: number | null
  tiempo_promedio: number
  recientes: EventoSimulacion[]
}

export interface EventoSimulacion {
  tipo: 'acierto' | 'error_pieza' | 'demora'
  componente: string | null
  componente_esperado: string | null
  segundos: number
  created_at: string
}

export async function obtenerProgreso(): Promise<ProgresoUsuario | null> {
  const { data, error } = await supabase
    .from('progreso_usuario')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[LogicFlow] Error cargando progreso:', error.message)
    return null
  }
  return data
}

export async function guardarProgreso(params: {
  componenteId: string
  segundos?: number
  total?: number
}): Promise<boolean> {
  const { componenteId, segundos = 0, total = 8 } = params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  try {
    const actual = await obtenerProgreso()
    const instalados = actual?.componentes_instalados || []

    if (instalados.includes(componenteId)) return true

    const nuevosInstalados = [...instalados, componenteId]
    const completado = nuevosInstalados.length >= total
    const ahora = new Date().toISOString()

    const campos: Partial<ProgresoUsuario> = {
      componentes_instalados: nuevosInstalados,
      paso_actual: Math.min(nuevosInstalados.length + 1, total + 1),
      total_componentes: total,
      simulaciones_completadas: completado
        ? (actual?.simulaciones_completadas || 0) + 1
        : (actual?.simulaciones_completadas || 0),
      ultimo_componente: componenteId,
      tiempo_total_segundos: (actual?.tiempo_total_segundos || 0) + Math.max(0, Math.round(segundos)),
      updated_at: ahora,
      ...(completado && !actual?.completed_at ? { completed_at: ahora } : {}),
    }

    if (actual?.id) {
      const { error } = await supabase
        .from('progreso_usuario')
        .update(campos)
        .eq('user_id', user.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('progreso_usuario')
        .insert({ user_id: user.id, ...campos })
      if (error) throw error
    }

    return true
  } catch (err: any) {
    console.warn('[LogicFlow] Error guardando progreso:', err.message)
    return false
  }
}

export async function reiniciarProgreso(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  try {
    const actual = await obtenerProgreso()
    const { error } = await supabase
      .from('progreso_usuario')
      .update({
        componentes_instalados: [],
        paso_actual: 1,
        ultimo_componente: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
        simulaciones_completadas: actual?.simulaciones_completadas || 0,
        tiempo_total_segundos: actual?.tiempo_total_segundos || 0,
      })
      .eq('user_id', user.id)

    if (error) throw error
    return true
  } catch (err: any) {
    console.warn('[LogicFlow] Error reiniciando progreso:', err.message)
    return false
  }
}

export async function registrarEvento(params: {
  tipo: 'acierto' | 'error_pieza' | 'demora'
  componenteId?: string
  componenteEsperado?: string
  segundos?: number
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  try {
    const { error } = await supabase.from('eventos_simulacion').insert({
      user_id: user.id,
      tipo: params.tipo,
      componente: params.componenteId || null,
      componente_esperado: params.componenteEsperado || null,
      segundos: Math.max(0, Math.round(params.segundos || 0)),
    })
    if (error) throw error
    return true
  } catch (err: any) {
    console.warn('[LogicFlow] Error registrando evento:', err.message)
    return false
  }
}

export async function obtenerEstadisticas(limite = 1000): Promise<Estadisticas | null> {
  try {
    const { data, error } = await supabase
      .from('eventos_simulacion')
      .select('tipo,componente,componente_esperado,segundos,created_at')
      .order('created_at', { ascending: false })
      .limit(limite)

    if (error) throw error

    const eventos: EventoSimulacion[] = data || []
    const aciertos = eventos.filter(e => e.tipo === 'acierto')
    const errores = eventos.filter(e => e.tipo === 'error_pieza')
    const demoras = eventos.filter(e => e.tipo === 'demora')
    const totalIntentos = aciertos.length + errores.length
    const precision = totalIntentos > 0
      ? Math.round((aciertos.length / totalIntentos) * 100)
      : null
    const tiempoPromedio = aciertos.length
      ? Math.round(aciertos.reduce((s, e) => s + (e.segundos || 0), 0) / aciertos.length)
      : 0

    return {
      aciertos: aciertos.length,
      errores_pieza: errores.length,
      demoras: demoras.length,
      total_intentos: totalIntentos,
      precision,
      tiempo_promedio: tiempoPromedio,
      recientes: eventos.slice(0, 8),
    }
  } catch (err: any) {
    console.warn('[LogicFlow] Error cargando estadísticas:', err.message)
    return null
  }
}
