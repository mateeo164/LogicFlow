// academia-api.js — Progreso de la Academia con sincronización a Supabase.
//
// Estrategia offline-first:
//   • localStorage es la fuente instantánea (la Academia funciona sin sesión y sin red).
//   • Si hay sesión, se sincroniza con progreso_usuario.academia_lecciones:
//       - al cargar: se FUSIONA (unión) lo local con lo del servidor, sin perder nada
//         (esto migra el progreso local previo a la nube la primera vez).
//       - al completar: se guarda local al instante y se empuja al servidor en segundo plano.
import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_KEYS } from './supabase-config.js'

const LOCAL_KEY = 'logicflow_academia_completadas'
const TIMEOUT = 12000

// ------------------------------------------------------------------ local
export function leerLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
}

function guardarLocal(arr) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...new Set(arr)]))
  } catch (e) { /* almacenamiento no disponible */ }
}

// ------------------------------------------------------------------ sesión
export function estaLogueado() {
  return !!localStorage.getItem(STORAGE_KEYS.accessToken)
}

function getUserId() {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken)
  if (!token) return null
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64))?.sub || null
  } catch { return null }
}

async function dataRequest(path, options = {}) {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken)
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const ctrl = new AbortController()
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: ctrl.signal
    })
    if (res.status === 204) return null
    const payload = await res.json().catch(() => null)
    if (!res.ok) throw new Error(payload?.message || payload?.error || `HTTP ${res.status}`)
    return payload
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Tiempo de espera agotado.')
    throw err
  } finally {
    clearTimeout(tid)
  }
}

// ------------------------------------------------------------------ servidor
async function obtenerServidor() {
  try {
    const data = await dataRequest('/progreso_usuario?select=academia_lecciones&limit=1')
    const fila = Array.isArray(data) ? data[0] : null
    const arr = fila?.academia_lecciones
    return Array.isArray(arr) ? arr : []
  } catch (err) {
    console.warn('[LogicFlow] No se pudieron leer las lecciones:', err.message)
    return null
  }
}

// Guarda (upsert) la lista completa en el servidor. Devuelve true si lo logró.
async function guardarServidor(lecciones) {
  const userId = getUserId()
  if (!userId) return false

  const campos = {
    academia_lecciones: [...new Set(lecciones)],
    academia_completadas: new Set(lecciones).size,
    academia_actualizado_at: new Date().toISOString()
  }

  try {
    // ¿Existe ya la fila del usuario?
    const existe = await dataRequest('/progreso_usuario?select=user_id&limit=1')
    const hayFila = Array.isArray(existe) && existe.length > 0

    if (hayFila) {
      await dataRequest(`/progreso_usuario?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: campos
      })
    } else {
      await dataRequest('/progreso_usuario', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: { user_id: userId, ...campos }
      })
    }
    return true
  } catch (err) {
    console.warn('[LogicFlow] No se pudo guardar el progreso de la Academia:', err.message)
    return false
  }
}

// ------------------------------------------------------------------ API pública
// Fusiona local + servidor (unión), guarda ambos y devuelve la lista final.
// Si no hay sesión o falla la red, devuelve simplemente lo local.
export async function sincronizar() {
  const local = leerLocal()
  if (!estaLogueado()) return local

  const remoto = await obtenerServidor()
  if (remoto === null) return local // sin red: seguimos con lo local

  const union = [...new Set([...local, ...remoto])]

  // Persiste local siempre; empuja al servidor solo si aporta algo nuevo.
  guardarLocal(union)
  if (union.length !== remoto.length) {
    guardarServidor(union)
  }
  return union
}

// Marca una lección como completada: local al instante + servidor en segundo plano.
// Devuelve la lista actualizada (para re-render inmediato).
export async function completar(id) {
  const actual = new Set(leerLocal())
  actual.add(id)
  const lista = [...actual]
  guardarLocal(lista)

  if (estaLogueado()) {
    // Fusiona con el servidor antes de guardar, por si otro dispositivo avanzó.
    const remoto = await obtenerServidor()
    const union = remoto ? [...new Set([...lista, ...remoto])] : lista
    guardarLocal(union)
    guardarServidor(union)
    return union
  }
  return lista
}
