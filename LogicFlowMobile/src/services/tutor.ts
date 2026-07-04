import { supabase } from './supabase'

export interface Clase {
  id: string
  nombre: string
  codigo: string
  created_at?: string
  estudiantes?: number
}

export interface ResumenEstudiante {
  estudiante_id: string
  nombre: string
  email: string
  nota_web: number | null
  web_aprobado: boolean
  movil_completado: boolean
  tiempo_total_segundos: number
  componentes: number
  retos_superados: number
  mejor_nota_reto: number | null
  logros_total: number
  inscrito_at: string
}

// --- Tutor ---
export async function crearClase(nombre: string): Promise<Clase | null> {
  const { data, error } = await supabase.rpc('lf_crear_clase', { p_nombre: nombre })
  if (error) throw new Error(error.message)
  return Array.isArray(data) ? data[0] : data
}

export async function misClasesTutor(): Promise<Clase[]> {
  const { data, error } = await supabase
    .from('lf_clases')
    .select('id,nombre,codigo,created_at,lf_inscripciones(count)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map((c: any) => ({
    ...c,
    estudiantes: c.lf_inscripciones?.[0]?.count ?? 0,
  }))
}

export async function resumenClase(claseId: string): Promise<ResumenEstudiante[]> {
  const { data, error } = await supabase.rpc('lf_tutor_resumen_clase', { p_clase_id: claseId })
  if (error) throw new Error(error.message)
  return data || []
}

// --- Estudiante ---
export async function unirseAClase(codigo: string): Promise<Clase | null> {
  const { data, error } = await supabase.rpc('lf_unirse_a_clase', { p_codigo: codigo })
  if (error) throw new Error(error.message)
  return Array.isArray(data) ? data[0] : data
}

export async function misClasesEstudiante(): Promise<Clase[]> {
  const { data, error } = await supabase
    .from('lf_clases')
    .select('id,nombre,codigo')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

// ---------- Tareas (Fase 2) ----------
export interface Tarea {
  id: string
  clase_id: string
  titulo: string
  descripcion: string | null
  puntaje_max: number
  vence_at: string | null
  created_at?: string
}

export interface EntregaResumen {
  estudiante_id: string
  nombre: string
  email: string
  entregada: boolean
  entregada_at: string | null
  nota: number | null
  comentario: string | null
  calificada: boolean
}

export interface MiTarea {
  tarea_id: string
  clase_id: string
  clase_nombre: string
  titulo: string
  descripcion: string | null
  puntaje_max: number
  vence_at: string | null
  entregada: boolean
  nota: number | null
  comentario: string | null
  calificada: boolean
}

// Tutor
export async function crearTarea(params: { claseId: string; titulo: string; descripcion?: string; puntajeMax?: number; venceAt?: string | null }): Promise<Tarea | null> {
  const { data, error } = await supabase
    .from('lf_tareas')
    .insert({
      clase_id: params.claseId,
      titulo: params.titulo,
      descripcion: params.descripcion || null,
      puntaje_max: Math.max(1, Math.min(100, params.puntajeMax || 10)),
      vence_at: params.venceAt || null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function tareasDeClase(claseId: string): Promise<Tarea[]> {
  const { data, error } = await supabase
    .from('lf_tareas')
    .select('id,clase_id,titulo,descripcion,puntaje_max,vence_at,created_at')
    .eq('clase_id', claseId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function resumenTarea(tareaId: string): Promise<EntregaResumen[]> {
  const { data, error } = await supabase.rpc('lf_resumen_tarea', { p_tarea_id: tareaId })
  if (error) throw new Error(error.message)
  return data || []
}

export async function calificarEntrega(params: { tareaId: string; estudianteId: string; nota: number | null; comentario?: string | null }): Promise<void> {
  const { error } = await supabase.rpc('lf_calificar_entrega', {
    p_tarea_id: params.tareaId,
    p_estudiante_id: params.estudianteId,
    p_nota: params.nota,
    p_comentario: params.comentario || null,
  })
  if (error) throw new Error(error.message)
}

// Estudiante
export async function entregarTarea(tareaId: string): Promise<void> {
  const { error } = await supabase.rpc('lf_entregar_tarea', { p_tarea_id: tareaId })
  if (error) throw new Error(error.message)
}

export async function misTareas(): Promise<MiTarea[]> {
  const { data, error } = await supabase.rpc('lf_mis_tareas')
  if (error) throw new Error(error.message)
  return data || []
}

// ---------- Notificaciones ----------
export interface Notificacion {
  id: string
  tipo: string
  titulo: string
  cuerpo: string | null
  leida: boolean
  created_at: string
}

export async function misNotificaciones(limite = 50): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from('lf_notificaciones')
    .select('id,tipo,titulo,cuerpo,leida,created_at')
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error) throw new Error(error.message)
  return data || []
}

export async function contarNotifsNoLeidas(): Promise<number> {
  const { count, error } = await supabase
    .from('lf_notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('leida', false)
  if (error) return 0
  return count || 0
}

export async function marcarNotifsLeidas(): Promise<void> {
  const { error } = await supabase
    .from('lf_notificaciones')
    .update({ leida: true })
    .eq('leida', false)
  if (error) throw new Error(error.message)
}
