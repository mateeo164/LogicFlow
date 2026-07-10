import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_KEYS, authStore } from './supabase-config.js'

const TIMEOUT = 12000

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

        if (!res.ok) {
            throw new Error(payload?.message || payload?.error || `HTTP ${res.status}`)
        }
        return payload
    } catch (err) {
        if (err.name === 'AbortError') throw new Error('Tiempo de espera agotado.')
        throw err
    } finally {
        clearTimeout(tid)
    }
}

export async function guardarResultadoReto({ retoId, nota, exito, erroresDiagnostico = 0, pistasUsadas = 0, inspecciones = 0, segundos = 0 }) {
    const userId = getUserId()
    if (!userId || !retoId) return false

    try {
        await dataRequest('/retos_resultados', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: {
                user_id: userId,
                reto_id: retoId,
                nota: Math.max(0, Math.min(10, Number(nota) || 0)),
                exito: !!exito,
                errores_diagnostico: Math.max(0, Math.round(erroresDiagnostico)),
                pistas_usadas: Math.max(0, Math.round(pistasUsadas)),
                inspecciones: Math.max(0, Math.round(inspecciones)),
                segundos: Math.max(0, Math.round(segundos))
            }
        })
        return true
    } catch (err) {
        console.warn('[LogicFlow] No se pudo guardar el resultado del reto:', err.message)
        return false
    }
}

// Devuelve [] cuando la consulta funcionó y de verdad no hay filas, o null cuando la
// petición en sí falló (red/timeout/sesión). Distinguirlo importa: un guardado que
// acaba de tener éxito pero cuyo GET posterior falla NO debe leerse como "sin historial".
export async function obtenerResultadosRetos() {
    try {
        const data = await dataRequest(
            '/retos_resultados?select=reto_id,nota,exito,errores_diagnostico,pistas_usadas,inspecciones,segundos,created_at' +
            '&order=created_at.desc&limit=500'
        )
        return Array.isArray(data) ? data : []
    } catch (err) {
        console.warn('[LogicFlow] No se pudieron cargar los resultados de retos:', err.message)
        return null
    }
}

export function resumirResultados(resultados) {
    const resumen = {}
    for (const r of resultados || []) {
        const cur = resumen[r.reto_id] || { nota: 0, exito: false, intentos: 0 }
        cur.intentos++
        cur.nota = Math.max(cur.nota, Number(r.nota) || 0)
        cur.exito = cur.exito || !!r.exito
        resumen[r.reto_id] = cur
    }
    return resumen
}

export async function otorgarLogros(logroIds, contexto = null) {
    const userId = getUserId()
    if (!userId || !logroIds?.length) return false

    try {
        await dataRequest('/logros_usuario?on_conflict=user_id,logro_id', {
            method: 'POST',
            headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
            body: logroIds.map(id => ({ user_id: userId, logro_id: id, contexto }))
        })
        return true
    } catch (err) {
        console.warn('[LogicFlow] No se pudieron guardar los logros:', err.message)
        return false
    }
}

export async function obtenerLogrosUsuario() {
    try {
        const data = await dataRequest('/logros_usuario?select=logro_id,created_at&order=created_at.asc')
        return Array.isArray(data) ? data.map(l => l.logro_id) : []
    } catch (err) {
        console.warn('[LogicFlow] No se pudieron cargar los logros:', err.message)
        return []
    }
}
