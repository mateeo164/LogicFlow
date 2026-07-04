import { supabase } from './supabase'

const BUCKET = 'ensambles'

// Decodifica base64 a bytes sin dependencias externas (para subir a Storage).
export function base64ToBytes(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '')
  const len = clean.length
  const bytes = new Uint8Array((len * 3) >> 2)
  let p = 0
  for (let i = 0; i < len; i += 4) {
    const e1 = chars.indexOf(clean[i])
    const e2 = chars.indexOf(clean[i + 1])
    const e3 = chars.indexOf(clean[i + 2])
    const e4 = chars.indexOf(clean[i + 3])
    bytes[p++] = (e1 << 2) | (e2 >> 4)
    if (e3 !== -1) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2)
    if (e4 !== -1) bytes[p++] = ((e3 & 3) << 6) | e4
  }
  return bytes.subarray(0, p)
}

// Otorga logros (idempotente: los duplicados se ignoran por la PK user_id+logro_id).
export async function otorgarLogros(logroIds: string[], contexto: string | null = null): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !logroIds?.length) return false
  try {
    const rows = logroIds.map(id => ({ user_id: user.id, logro_id: id, contexto }))
    const { error } = await supabase
      .from('logros_usuario')
      .upsert(rows, { onConflict: 'user_id,logro_id', ignoreDuplicates: true })
    if (error) throw error
    return true
  } catch (err: any) {
    console.warn('[LogicFlow] No se pudieron guardar los logros:', err.message)
    return false
  }
}

export async function obtenerLogrosUsuario(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('logros_usuario')
      .select('logro_id')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map((l: any) => l.logro_id)
  } catch (err: any) {
    console.warn('[LogicFlow] No se pudieron cargar los logros:', err.message)
    return []
  }
}

// Sube una foto (base64) bajo la carpeta del usuario. Devuelve el path o null.
export async function subirFoto(nombre: string, base64: string, contentType = 'image/jpeg'): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !base64) return null
  const path = `${user.id}/${nombre}`
  try {
    const bytes = base64ToBytes(base64)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType, upsert: true })
    if (error) throw error
    return path
  } catch (err: any) {
    console.warn('[LogicFlow] No se pudo subir la foto:', err.message)
    return null
  }
}

// URL firmada temporal para mostrar una imagen privada del bucket.
export async function obtenerUrlFirmada(path: string | null | undefined, segundos = 3600): Promise<string | null> {
  if (!path) return null
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, segundos)
    if (error) throw error
    return data?.signedUrl || null
  } catch (err: any) {
    console.warn('[LogicFlow] No se pudo firmar la URL:', err.message)
    return null
  }
}

export interface Certificado {
  user_id?: string
  emitido_at?: string
  tiempo_total_segundos: number
  nota_web: number | null
  foto_simulador_path: string | null
  foto_real_path: string | null
  logros_total: number
}

export async function guardarCertificado(cert: Certificado): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  try {
    const { error } = await supabase
      .from('certificados')
      .upsert({ user_id: user.id, ...cert }, { onConflict: 'user_id' })
    if (error) throw error
    return true
  } catch (err: any) {
    console.warn('[LogicFlow] No se pudo guardar el certificado:', err.message)
    return false
  }
}

export async function obtenerCertificado(): Promise<Certificado | null> {
  try {
    const { data, error } = await supabase
      .from('certificados')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  } catch (err: any) {
    console.warn('[LogicFlow] No se pudo cargar el certificado:', err.message)
    return null
  }
}
