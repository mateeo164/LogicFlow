import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_KEYS, authStore } from './supabase-config.js'
import { leccionesEnOrden } from './academia-data.js'

const LOCAL_KEY = 'logicflow_academia_completadas'
const LOCAL_KEY_ACIERTOS = 'logicflow_academia_aciertos'
export const UMBRAL_APROBACION_ACADEMIA = 0.7
const TIMEOUT = 12000

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
  } catch (e) {}
}

export function leerAciertos() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_ACIERTOS)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
}

function guardarAciertosLocal(arr) {
  try {
    localStorage.setItem(LOCAL_KEY_ACIERTOS, JSON.stringify([...new Set(arr)]))
  } catch (e) {}
}

export function registrarQuiz(id, acierto) {
  const set = new Set(leerAciertos())
  if (!acierto || set.has(id)) return [...set]

  set.add(id)
  const lista = [...set]
  guardarAciertosLocal(lista)
  if (estaLogueado()) guardarServidor(leerLocal(), lista)
  return lista
}

export function estadoAcademia(completadas = leerLocal(), aciertos = leerAciertos()) {
  const orden = leccionesEnOrden()
  const totalLecciones = orden.length
  const idsConQuiz = orden.filter(l => l.quiz).map(l => l.id)
  const totalQuizzes = idsConQuiz.length

  const setHechas = new Set(completadas)
  const setAciertos = new Set(aciertos)

  const leccionesCompletadas = orden.filter(l => setHechas.has(l.id)).length
  const correctas = idsConQuiz.filter(id => setAciertos.has(id)).length

  const pctQuiz = totalQuizzes ? correctas / totalQuizzes : 1
  const notaSobre10 = Math.round(pctQuiz * 100) / 10
  const notaMinima = Math.round(UMBRAL_APROBACION_ACADEMIA * 100) / 10
  const todoLeido = totalLecciones ? leccionesCompletadas >= totalLecciones : true
  const buenaNota = pctQuiz >= UMBRAL_APROBACION_ACADEMIA

  return {
    totalLecciones,
    leccionesCompletadas,
    todoLeido,
    totalQuizzes,
    correctas,
    pctQuiz,
    notaSobre10,
    notaMinima,
    buenaNota,
    aprobada: todoLeido && buenaNota
  }
}

export function academiaAprobada() {
  return estadoAcademia().aprobada
}

export function estaLogueado() {
  return !!authStore.getItem(STORAGE_KEYS.accessToken)
}

function getUserId() {
  const token = authStore.getItem(STORAGE_KEYS.accessToken)
  if (!token) return null
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64))?.sub || null
  } catch { return null }
}

async function dataRequest(path, options = {}) {
  const token = authStore.getItem(STORAGE_KEYS.accessToken)
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

let soportaNota = null

function esColumnaFaltante(err) {
  const msg = String(err?.message || '')
  return /academia_aciertos|academia_nota/i.test(msg) || /column .* does not exist/i.test(msg)
}

async function obtenerServidor() {
  if (soportaNota !== false) {
    try {
      const data = await dataRequest('/progreso_usuario?select=academia_lecciones,academia_aciertos&limit=1')
      soportaNota = true
      const fila = Array.isArray(data) ? data[0] : null
      return {
        lecciones: Array.isArray(fila?.academia_lecciones) ? fila.academia_lecciones : [],
        aciertos: Array.isArray(fila?.academia_aciertos) ? fila.academia_aciertos : []
      }
    } catch (err) {
      if (!esColumnaFaltante(err)) {
        console.warn('[LogicFlow] No se pudo leer el progreso de la Academia:', err.message)
        return null
      }
      soportaNota = false
    }
  }

  try {
    const data = await dataRequest('/progreso_usuario?select=academia_lecciones&limit=1')
    const fila = Array.isArray(data) ? data[0] : null
    return {
      lecciones: Array.isArray(fila?.academia_lecciones) ? fila.academia_lecciones : [],
      aciertos: []
    }
  } catch (err) {
    console.warn('[LogicFlow] No se pudieron leer las lecciones:', err.message)
    return null
  }
}

let colaEscrituraServidor = Promise.resolve()

function guardarServidor(lecciones, aciertos = leerAciertos()) {
  const tarea = colaEscrituraServidor.then(() => guardarServidorInterno(lecciones, aciertos))
  colaEscrituraServidor = tarea.catch(() => {})
  return tarea
}

async function guardarServidorInterno(lecciones, aciertos) {
  const userId = getUserId()
  if (!userId) return false

  const base = {
    academia_lecciones: [...new Set(lecciones)],
    academia_completadas: new Set(lecciones).size,
    academia_actualizado_at: new Date().toISOString()
  }
  const conNota = {
    ...base,
    academia_aciertos: [...new Set(aciertos)],
    academia_nota: estadoAcademia(lecciones, aciertos).notaSobre10
  }

  async function escribir(campos) {
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
  }

  try {
    if (soportaNota === false) {
      await escribir(base)
      return true
    }
    try {
      await escribir(conNota)
      soportaNota = true
      return true
    } catch (err) {
      if (!esColumnaFaltante(err)) throw err
      soportaNota = false
      await escribir(base)
      return true
    }
  } catch (err) {
    console.warn('[LogicFlow] No se pudo guardar el progreso de la Academia:', err.message)
    return false
  }
}

export async function sincronizar() {
  const local = leerLocal()
  const localAciertos = leerAciertos()
  if (!estaLogueado()) return local

  const remoto = await obtenerServidor()
  if (remoto === null) return local

  const union = [...new Set([...local, ...remoto.lecciones])]
  const unionAciertos = [...new Set([...localAciertos, ...remoto.aciertos])]

  guardarLocal(union)
  guardarAciertosLocal(unionAciertos)
  if (union.length !== remoto.lecciones.length || unionAciertos.length !== remoto.aciertos.length) {
    guardarServidor(union, unionAciertos)
  }
  return union
}

export async function completar(id) {
  const actual = new Set(leerLocal())
  actual.add(id)
  const lista = [...actual]
  guardarLocal(lista)

  if (estaLogueado()) {
    const remoto = await obtenerServidor()
    const union = remoto ? [...new Set([...lista, ...remoto.lecciones])] : lista
    const unionAciertos = remoto
      ? [...new Set([...leerAciertos(), ...remoto.aciertos])]
      : leerAciertos()
    guardarLocal(union)
    guardarAciertosLocal(unionAciertos)
    guardarServidor(union, unionAciertos)
    return union
  }
  return lista
}
