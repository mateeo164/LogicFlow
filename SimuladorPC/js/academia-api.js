// academia-api.js — Progreso y calificación de la Academia, sincronizados a Supabase.
//
// Estrategia offline-first:
//   • localStorage es la fuente instantánea (la Academia funciona sin sesión y sin red).
//   • Si hay sesión, se sincroniza con progreso_usuario:
//       - lecciones leídas → academia_lecciones / academia_completadas
//       - calificación     → academia_aciertos / academia_nota   (supabase/academia-nota.sql)
//       - al cargar: se FUSIONA (unión) lo local con lo del servidor, sin perder nada
//         (esto migra el progreso local previo a la nube la primera vez).
//       - al completar/acertar: se guarda local al instante y se empuja en segundo plano.
//
// Si supabase/academia-nota.sql NO se ha ejecutado, el cliente lo detecta (la columna
// no existe) y degrada: sigue guardando las lecciones y deja la nota solo en local.
import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_KEYS, authStore } from './supabase-config.js'
import { leccionesEnOrden } from './academia-data.js'

const LOCAL_KEY = 'logicflow_academia_completadas'
// Calificación de la Academia: ids de lección cuyo mini-quiz se respondió BIEN.
// Es la fuente de la "buena calificación" que exige el laboratorio 3D.
const LOCAL_KEY_ACIERTOS = 'logicflow_academia_aciertos'
// Nota mínima (proporción de mini-quiz acertados) para desbloquear el simulador.
export const UMBRAL_APROBACION_ACADEMIA = 0.7
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

// ------------------------------------------------------- calificación (quiz)
// Lista de ids de lección cuyo mini-quiz se acertó (fuente instantánea local).
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
  } catch (e) { /* almacenamiento no disponible */ }
}

// Registra el resultado del mini-quiz de una lección.
//
// Semántica "mejor intento gana": acertar acredita la lección para siempre; un
// fallo posterior NO la retira. Es lo coherente con la fusión por UNIÓN entre
// dispositivos (el servidor volvería a añadirla) y con la idea de que reintentar
// un quiz solo puede subir la nota, nunca bajarla.
//
// Devuelve la lista actualizada de aciertos (local al instante; empuja en 2º plano).
export function registrarQuiz(id, acierto) {
  const set = new Set(leerAciertos())
  if (!acierto || set.has(id)) return [...set]

  set.add(id)
  const lista = [...set]
  guardarAciertosLocal(lista)
  // El gate ya funciona con lo local; el servidor se actualiza sin bloquear la UI.
  if (estaLogueado()) guardarServidor(leerLocal(), lista)
  return lista
}

// Estado agregado de la Academia: cuánto se leyó, cuántos quiz se acertaron y si
// se cumple el requisito para entrar al laboratorio 3D (todo leído + buena nota).
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
  const notaSobre10 = Math.round(pctQuiz * 100) / 10        // 6/8 → 7.5
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

// ¿Puede el usuario entrar al laboratorio 3D? (lectura síncrona, sin red).
export function academiaAprobada() {
  return estadoAcademia().aprobada
}

// ------------------------------------------------------------------ sesión
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

// ------------------------------------------------------------------ servidor
// ¿Se ejecutó supabase/academia-nota.sql? null = aún no lo sabemos.
// Se descubre en la primera petición y evita reintentar el esquema nuevo en balde.
let soportaNota = null

// PostgREST responde 400 con "column ... does not exist" (SQLSTATE 42703) si la
// migración no se ha corrido. Distinguirlo de un fallo de red es lo que permite
// degradar sin romper el guardado de lecciones, que sí funciona desde antes.
function esColumnaFaltante(err) {
  const msg = String(err?.message || '')
  return /academia_aciertos|academia_nota/i.test(msg) || /column .* does not exist/i.test(msg)
}

// Devuelve { lecciones, aciertos } del servidor, o null si no se pudo leer.
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
      soportaNota = false // falta la migración: caemos al esquema anterior
    }
  }

  try {
    const data = await dataRequest('/progreso_usuario?select=academia_lecciones&limit=1')
    const fila = Array.isArray(data) ? data[0] : null
    return {
      lecciones: Array.isArray(fila?.academia_lecciones) ? fila.academia_lecciones : [],
      aciertos: [] // sin columna: la nota vive solo en local
    }
  } catch (err) {
    console.warn('[LogicFlow] No se pudieron leer las lecciones:', err.message)
    return null
  }
}

// Serializa las escrituras al servidor: registrarQuiz() y completar() pueden
// dispararse casi al mismo tiempo (ver leccion.js), y guardarServidorInterno hace
// un GET (¿existe fila?) + PATCH/POST no atómico. Sin esto, dos llamadas en vuelo
// a la vez competían por red y la que respondiera último podía pisar a la otra con
// datos desactualizados (p. ej. guardar la nota sin la lección recién completada).
// Encolarlas hace que ganen en el orden en que se pidieron, no en el que responda
// la red primero.
let colaEscrituraServidor = Promise.resolve()

// Guarda (upsert) lecciones + calificación en el servidor. Devuelve true si lo logró.
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
      // Sin migración: al menos no perdemos las lecciones.
      soportaNota = false
      await escribir(base)
      return true
    }
  } catch (err) {
    console.warn('[LogicFlow] No se pudo guardar el progreso de la Academia:', err.message)
    return false
  }
}

// ------------------------------------------------------------------ API pública
// Fusiona local + servidor (unión) para lecciones Y calificación, persiste ambos
// y devuelve la lista de lecciones completadas.
// Si no hay sesión o falla la red, devuelve simplemente lo local.
export async function sincronizar() {
  const local = leerLocal()
  const localAciertos = leerAciertos()
  if (!estaLogueado()) return local

  const remoto = await obtenerServidor()
  if (remoto === null) return local // sin red: seguimos con lo local

  const union = [...new Set([...local, ...remoto.lecciones])]
  const unionAciertos = [...new Set([...localAciertos, ...remoto.aciertos])]

  // Persiste local siempre; empuja al servidor solo si aportamos algo nuevo.
  guardarLocal(union)
  guardarAciertosLocal(unionAciertos)
  if (union.length !== remoto.lecciones.length || unionAciertos.length !== remoto.aciertos.length) {
    guardarServidor(union, unionAciertos)
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
