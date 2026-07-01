

import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_KEYS, supabaseAuthRequest } from './supabase-config.js'

const TIMEOUT = 12000

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

export async function obtenerProgreso() {
    try {
        const data = await dataRequest('/progreso_usuario?select=*&limit=1')
        return Array.isArray(data) ? (data[0] || null) : null
    } catch (err) {
        console.warn('[LogicFlow] No se pudo cargar el progreso:', err.message)
        return null
    }
}

export async function guardarProgreso({ componenteId, segundos = 0, total = 6 }) {
    const userId = getUserId()
    if (!userId) return false

    try {
        const actual = await obtenerProgreso()
        const instalados = actual?.componentes_instalados || []

        if (instalados.includes(componenteId)) return true

        const nuevosInstalados = [...instalados, componenteId]
        const totalComponentes = total
        const pasoActual = nuevosInstalados.length + 1
        const completado = nuevosInstalados.length >= totalComponentes
        const ahora = new Date().toISOString()

        const campos = {
            componentes_instalados: nuevosInstalados,
            paso_actual: Math.min(pasoActual, totalComponentes + 1),
            total_componentes: totalComponentes,
            simulaciones_completadas: completado
                ? (actual?.simulaciones_completadas || 0) + 1
                : (actual?.simulaciones_completadas || 0),
            ultimo_componente: componenteId,
            tiempo_total_segundos: (actual?.tiempo_total_segundos || 0) + Math.max(0, Math.round(segundos)),
            updated_at: ahora,
            ...(completado && !actual?.completed_at ? { completed_at: ahora } : {})
        }

        if (actual) {
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
        console.warn('[LogicFlow] No se pudo guardar el progreso:', err.message)
        return false
    }
}

/**
 * Persiste la NOTA del ensamble web en Supabase. Es lo que la app móvil lee
 * para desbloquear el ensamble real con AR (requiere nota >= 7). Conserva la
 * mejor nota y nunca degrada un "aprobado" ya obtenido.
 */
export async function guardarNotaWeb({ nota, aprobado }) {
    const userId = getUserId()
    if (!userId) return false

    try {
        const actual = await obtenerProgreso()
        const ahora = new Date().toISOString()

        const prevNota = typeof actual?.ensamble_web_nota === 'number' ? actual.ensamble_web_nota : null
        const mejorNota = prevNota !== null ? Math.max(prevNota, nota) : nota
        const yaAprobado = actual?.ensamble_web_aprobado === true
        const aprobadoFinal = yaAprobado || !!aprobado

        const campos = {
            ensamble_web_nota: Math.round(mejorNota * 100) / 100,
            ensamble_web_aprobado: aprobadoFinal,
            updated_at: ahora,
            ...(aprobadoFinal && !actual?.ensamble_web_completado_at ? { ensamble_web_completado_at: ahora } : {})
        }

        if (actual) {
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
        console.warn('[LogicFlow] No se pudo guardar la nota web:', err.message)
        return false
    }
}

export async function reiniciarProgreso() {
    const userId = getUserId()
    if (!userId) return false

    try {
        const actual = await obtenerProgreso()
        await dataRequest(`/progreso_usuario?user_id=eq.${userId}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: {
                componentes_instalados: [],
                paso_actual: 1,
                ultimo_componente: null,
                completed_at: null,
                updated_at: new Date().toISOString(),
                simulaciones_completadas: actual?.simulaciones_completadas || 0,
                tiempo_total_segundos: actual?.tiempo_total_segundos || 0
            }
        })
        return true
    } catch (err) {
        console.warn('[LogicFlow] No se pudo reiniciar el progreso:', err.message)
        return false
    }
}

export async function actualizarPerfil({ full_name, institucion }) {
    try {
        await supabaseAuthRequest('/user', {
            method: 'PUT',
            body: {
                data: {
                    full_name: full_name || undefined,
                    institucion: institucion ?? null
                }
            }
        })

        const raw = localStorage.getItem(STORAGE_KEYS.user)
        if (raw) {
            const user = JSON.parse(raw)
            user.user_metadata = {
                ...user.user_metadata,
                ...(full_name ? { full_name } : {}),
                institucion: institucion ?? null
            }
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
        }

        return { exito: true }
    } catch (err) {
        return { exito: false, mensaje: `✗ ${err.message}` }
    }
}

export async function registrarEvento({ tipo, componenteId = null, componenteEsperado = null, segundos = 0 }) {
    const userId = getUserId()
    if (!userId || !tipo) return false

    try {
        await dataRequest('/eventos_simulacion', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: {
                user_id: userId,
                tipo,
                componente: componenteId,
                componente_esperado: componenteEsperado,
                segundos: Math.max(0, Math.round(segundos || 0))
            }
        })
        return true
    } catch (err) {
        console.warn('[LogicFlow] No se pudo registrar el evento:', err.message)
        return false
    }
}

export async function obtenerEstadisticas({ limite = 1000 } = {}) {
    try {
        const data = await dataRequest(
            `/eventos_simulacion?select=tipo,componente,componente_esperado,segundos,created_at` +
            `&order=created_at.desc&limit=${limite}`
        )
        const eventos = Array.isArray(data) ? data : []

        const aciertos = eventos.filter(e => e.tipo === 'acierto')
        const errores  = eventos.filter(e => e.tipo === 'error_pieza')
        const demoras  = eventos.filter(e => e.tipo === 'demora')

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
            recientes: eventos.slice(0, 8)
        }
    } catch (err) {
        console.warn('[LogicFlow] No se pudieron cargar las estadísticas:', err.message)
        return null
    }
}
