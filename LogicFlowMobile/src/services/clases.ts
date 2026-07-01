import { supabase } from './supabase'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  institucion: string | null
  rol: 'Estudiante' | 'Tutor'
}

export interface Clase {
  id: string
  docente_id: string
  nombre: string
  descripcion: string | null
  codigo: string
  activa: boolean
  created_at: string
}

export interface ClaseTarea {
  id: string
  clase_id: string
  categoria: 'deber' | 'reto'
  titulo: string
  descripcion: string | null
  tipo_meta: 'web_nota_minima' | 'web_aprobado' | 'ar_completo'
  meta_valor: number | null
  xp_bonus: number
  fecha_limite: string | null
  activo: boolean
  created_at: string
}

export interface RosterProgreso {
  ensamble_web_nota: number | null
  ensamble_web_aprobado: boolean | null
  ensamble_real_instalados: string[] | null
  ensamble_real_completado_at: string | null
  completed_at: string | null
}

export interface RosterEntry {
  matriculaId: string
  estudianteId: string
  matriculadoEn: string
  perfil: Profile | null
  progreso: RosterProgreso | null
}

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin O/0/I/1 ambiguos

function generarCodigoClase(): string {
  let codigo = ''
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)]
  }
  return codigo
}

/** Crea una clase con un código único, reintentando ante colisión (23505). */
export async function crearClase(params: { nombre: string; descripcion?: string }): Promise<Clase | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !params.nombre.trim()) return null

  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigoClase()
    const { data, error } = await supabase
      .from('clases')
      .insert({ docente_id: user.id, nombre: params.nombre.trim(), descripcion: params.descripcion?.trim() || null, codigo })
      .select()
      .single()

    if (!error) return data
    if (error.code !== '23505') {
      console.warn('[LogicFlow] Error creando clase:', error.message)
      return null
    }
    // colisión de código: reintenta con uno nuevo
  }
  console.warn('[LogicFlow] No se pudo generar un código de clase único.')
  return null
}

export async function obtenerMisClases(): Promise<Clase[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('clases')
    .select('*')
    .eq('docente_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[LogicFlow] Error cargando clases:', error.message)
    return []
  }
  return data || []
}

export async function obtenerClase(claseId: string): Promise<Clase | null> {
  const { data, error } = await supabase.from('clases').select('*').eq('id', claseId).maybeSingle()
  if (error) {
    console.warn('[LogicFlow] Error cargando clase:', error.message)
    return null
  }
  return data
}

export async function obtenerClasePorCodigo(codigo: string): Promise<Pick<Clase, 'id' | 'nombre' | 'docente_id'> | null> {
  if (!codigo?.trim()) return null
  const { data, error } = await supabase
    .from('clases')
    .select('id,nombre,docente_id')
    .eq('codigo', codigo.trim().toUpperCase())
    .eq('activa', true)
    .maybeSingle()

  if (error) {
    console.warn('[LogicFlow] Error buscando clase por código:', error.message)
    return null
  }
  return data
}

/** Matricula al usuario actual en la clase cuyo código coincide. */
export async function unirseAClase(codigo: string): Promise<{ exito: boolean; mensaje?: string; clase?: Pick<Clase, 'id' | 'nombre' | 'docente_id'>; yaMatriculado?: boolean }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { exito: false, mensaje: 'Debes iniciar sesión.' }

  const clase = await obtenerClasePorCodigo(codigo)
  if (!clase) return { exito: false, mensaje: 'No existe una clase activa con ese código.' }

  const { error } = await supabase.from('matriculas').insert({ clase_id: clase.id, estudiante_id: user.id })

  if (!error) return { exito: true, clase }
  if (error.code === '23505') return { exito: true, clase, yaMatriculado: true }

  console.warn('[LogicFlow] Error al unirse a la clase:', error.message)
  return { exito: false, mensaje: 'No se pudo unir a la clase. Intenta de nuevo.' }
}

export async function eliminarEstudianteDeClase(matriculaId: string): Promise<boolean> {
  const { error } = await supabase.from('matriculas').delete().eq('id', matriculaId)
  if (error) {
    console.warn('[LogicFlow] Error quitando estudiante:', error.message)
    return false
  }
  return true
}

/**
 * Roster de una clase: matrículas + perfil + progreso de cada estudiante.
 * No hay FK directa matriculas→profiles, así que se combinan 3 queries
 * simples en paralelo en vez de forzar un embed de PostgREST.
 */
export async function obtenerRoster(claseId: string): Promise<RosterEntry[]> {
  const { data: matriculas, error } = await supabase
    .from('matriculas')
    .select('id,estudiante_id,created_at')
    .eq('clase_id', claseId)

  if (error) {
    console.warn('[LogicFlow] Error cargando roster:', error.message)
    return []
  }
  if (!matriculas || matriculas.length === 0) return []

  const ids = matriculas.map(m => m.estudiante_id)

  const [{ data: perfiles }, { data: progresos }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,email,institucion,rol').in('id', ids),
    supabase
      .from('progreso_usuario')
      .select('user_id,ensamble_web_nota,ensamble_web_aprobado,ensamble_real_instalados,ensamble_real_completado_at,completed_at')
      .in('user_id', ids),
  ])

  const perfilPorId = new Map((perfiles || []).map((p: any) => [p.id, p]))
  const progresoPorId = new Map((progresos || []).map((p: any) => [p.user_id, p]))

  return matriculas.map(m => ({
    matriculaId: m.id,
    estudianteId: m.estudiante_id,
    matriculadoEn: m.created_at,
    perfil: perfilPorId.get(m.estudiante_id) || null,
    progreso: progresoPorId.get(m.estudiante_id) || null,
  }))
}

export async function crearTarea(params: {
  claseId: string
  categoria: 'deber' | 'reto'
  titulo: string
  descripcion?: string
  tipoMeta: ClaseTarea['tipo_meta']
  metaValor?: string | number
  xpBonus?: string | number
  fechaLimite?: string
}): Promise<ClaseTarea | null> {
  if (!params.claseId || !params.titulo.trim()) return null

  const { data, error } = await supabase
    .from('clase_tareas')
    .insert({
      clase_id: params.claseId,
      categoria: params.categoria,
      titulo: params.titulo.trim(),
      descripcion: params.descripcion?.trim() || null,
      tipo_meta: params.tipoMeta,
      meta_valor: params.tipoMeta === 'web_nota_minima' ? Number(params.metaValor) : null,
      xp_bonus: params.categoria === 'reto' ? Math.max(0, Math.round(Number(params.xpBonus) || 0)) : 0,
      fecha_limite: params.categoria === 'deber' && params.fechaLimite ? new Date(params.fechaLimite).toISOString() : null,
    })
    .select()
    .single()

  if (error) {
    console.warn('[LogicFlow] Error creando tarea:', error.message)
    return null
  }
  return data
}

export async function obtenerTareas(claseId: string, categoria?: 'deber' | 'reto'): Promise<ClaseTarea[]> {
  let query = supabase
    .from('clase_tareas')
    .select('*')
    .eq('clase_id', claseId)
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (categoria) query = query.eq('categoria', categoria)

  const { data, error } = await query
  if (error) {
    console.warn('[LogicFlow] Error cargando tareas:', error.message)
    return []
  }
  return data || []
}

export async function eliminarTarea(tareaId: string): Promise<boolean> {
  const { error } = await supabase
    .from('clase_tareas')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', tareaId)

  if (error) {
    console.warn('[LogicFlow] Error eliminando tarea:', error.message)
    return false
  }
  return true
}

/**
 * ¿Un estudiante (fila de progreso_usuario) cumple una tarea? Única fuente
 * de verdad para esta regla, portada 1:1 de SimuladorPC/js/clases.js.
 */
export function calcularCumplimiento(tarea: ClaseTarea, progreso: RosterProgreso | null): boolean {
  if (!progreso) return false
  switch (tarea.tipo_meta) {
    case 'web_nota_minima':
      return typeof progreso.ensamble_web_nota === 'number' && progreso.ensamble_web_nota >= Number(tarea.meta_valor)
    case 'web_aprobado':
      return progreso.ensamble_web_aprobado === true
    case 'ar_completo':
      return !!progreso.ensamble_real_completado_at
    default:
      return false
  }
}
