import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_KEYS } from './supabase-config.js'

const TIMEOUT = 12000

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

function rpc(fn, params) {
    return dataRequest(`/rpc/${fn}`, { method: 'POST', body: params })
}

export async function crearClase(nombre) {
    return rpc('lf_crear_clase', { p_nombre: nombre })
}

export async function misClasesTutor() {
    const data = await dataRequest('/lf_clases?select=id,nombre,codigo,created_at,lf_inscripciones(count)&order=created_at.desc')
    return (Array.isArray(data) ? data : []).map(c => ({
        ...c,
        estudiantes: c.lf_inscripciones?.[0]?.count ?? 0
    }))
}

export async function resumenClase(claseId) {
    const data = await rpc('lf_tutor_resumen_clase', { p_clase_id: claseId })
    return Array.isArray(data) ? data : []
}

// Tutor: renombra una clase.
export async function renombrarClase(claseId, nombre) {
    await dataRequest(`/lf_clases?id=eq.${claseId}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: { nombre }
    })
    return true
}

// Tutor: elimina una clase (en cascada borra inscripciones/tareas).
export async function eliminarClase(claseId) {
    await dataRequest(`/lf_clases?id=eq.${claseId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
    return true
}

// Tutor: quita a un estudiante de una clase.
export async function quitarEstudiante(claseId, estudianteId) {
    await dataRequest(`/lf_inscripciones?clase_id=eq.${claseId}&estudiante_id=eq.${estudianteId}`, {
        method: 'DELETE', headers: { Prefer: 'return=minimal' }
    })
    return true
}

export async function unirseAClase(codigo) {
    return rpc('lf_unirse_a_clase', { p_codigo: codigo })
}

export async function misClasesEstudiante() {
    const data = await dataRequest('/lf_clases?select=id,nombre,codigo&order=created_at.desc')
    return Array.isArray(data) ? data : []
}

export async function crearTarea({ claseId, titulo, descripcion = null, puntajeMax = 10, venceAt = null }) {
    const data = await dataRequest('/lf_tareas', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: {
            clase_id: claseId,
            titulo,
            descripcion: descripcion || null,
            puntaje_max: Math.max(1, Math.min(100, Number(puntajeMax) || 10)),
            vence_at: venceAt || null
        }
    })
    return Array.isArray(data) ? data[0] : data
}

export async function eliminarTarea(tareaId) {
    await dataRequest(`/lf_tareas?id=eq.${tareaId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
    return true
}

export async function tareasDeClase(claseId) {
    const data = await dataRequest(`/lf_tareas?clase_id=eq.${claseId}&select=id,titulo,descripcion,puntaje_max,vence_at,created_at&order=created_at.desc`)
    return Array.isArray(data) ? data : []
}

export async function resumenTarea(tareaId) {
    const data = await rpc('lf_resumen_tarea', { p_tarea_id: tareaId })
    return Array.isArray(data) ? data : []
}

export async function calificarEntrega({ tareaId, estudianteId, nota, comentario = null }) {
    return rpc('lf_calificar_entrega', {
        p_tarea_id: tareaId,
        p_estudiante_id: estudianteId,
        p_nota: nota == null ? null : Number(nota),
        p_comentario: comentario || null
    })
}

export async function entregarTarea(tareaId) {
    return rpc('lf_entregar_tarea', { p_tarea_id: tareaId })
}

export async function misTareas() {
    const data = await rpc('lf_mis_tareas', {})
    return Array.isArray(data) ? data : []
}

// --- Notificaciones ---

// Notificaciones del usuario (más recientes primero).
export async function misNotificaciones(limite = 50) {
    const data = await dataRequest(`/lf_notificaciones?select=id,tipo,titulo,cuerpo,leida,created_at&order=created_at.desc&limit=${limite}`)
    return Array.isArray(data) ? data : []
}

// Marca como leídas todas las notificaciones sin leer.
export async function marcarNotifsLeidas() {
    await dataRequest('/lf_notificaciones?leida=eq.false', {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: { leida: true }
    })
    return true
}
