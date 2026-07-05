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

// Conceptos con más dificultad en la clase (agrega las respuestas conceptuales).
// Devuelve [{ componente, aciertos, errores, total, pct_error }] ordenado por dificultad.
export async function conceptosDificilesClase(claseId) {
    const data = await rpc('lf_conceptos_dificiles_clase', { p_clase_id: claseId })
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

export async function entregarTarea(tareaId, { archivoPath = null, archivoNombre = null } = {}) {
    return rpc('lf_entregar_tarea', {
        p_tarea_id: tareaId,
        p_archivo_path: archivoPath,
        p_archivo_nombre: archivoNombre
    })
}

// --- Archivos de entrega (Supabase Storage · bucket privado "entregas") ---

const ENTREGAS_BUCKET = 'entregas'
const MAX_ARCHIVO_BYTES = 10 * 1024 * 1024 // 10 MB
const TIPOS_PERMITIDOS = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
]

function nombreSeguro(nombre) {
    const punto = nombre.lastIndexOf('.')
    const base = (punto > 0 ? nombre.slice(0, punto) : nombre)
        .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quita acentos
        .replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'archivo'
    const ext = (punto > 0 ? nombre.slice(punto).toLowerCase() : '')
        .replace(/[^a-z0-9.]/g, '')
    return `${base.slice(0, 60)}${ext}`
}

// Sube el archivo de la entrega y devuelve { path, nombre }.
// Lanza Error con mensaje claro si el tipo/tamaño no es válido.
export async function subirArchivoEntrega(tareaId, file) {
    if (!file) throw new Error('No se seleccionó ningún archivo.')
    if (file.size > MAX_ARCHIVO_BYTES) throw new Error('El archivo supera el límite de 10 MB.')
    if (file.type && !TIPOS_PERMITIDOS.includes(file.type)) {
        throw new Error('Formato no permitido. Sube un PDF, Word o imagen.')
    }

    const token = localStorage.getItem(STORAGE_KEYS.accessToken)
    const userId = obtenerUserId()
    if (!userId) throw new Error('Sesión no válida. Vuelve a iniciar sesión.')

    const nombre = nombreSeguro(file.name || 'archivo.pdf')
    const path = `${tareaId}/${userId}/${nombre}`

    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 60000) // subidas: hasta 60 s
    try {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${ENTREGAS_BUCKET}/${encodeURI(path)}`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${token}`,
                'Content-Type': file.type || 'application/octet-stream',
                'x-upsert': 'true'
            },
            body: file,
            signal: ctrl.signal
        })
        if (!res.ok) {
            const payload = await res.json().catch(() => null)
            throw new Error(payload?.message || payload?.error || `No se pudo subir el archivo (HTTP ${res.status}).`)
        }
        return { path, nombre: file.name || nombre }
    } catch (err) {
        if (err.name === 'AbortError') throw new Error('La subida tardó demasiado. Revisa tu conexión.')
        throw err
    } finally {
        clearTimeout(tid)
    }
}

// Genera una URL firmada temporal para descargar/ver un archivo de entrega.
export async function urlArchivoEntrega(path, expiraSeg = 3600) {
    const data = await storageRequest(`/object/sign/${ENTREGAS_BUCKET}/${encodeURI(path)}`, {
        method: 'POST',
        body: { expiresIn: expiraSeg }
    })
    if (!data?.signedURL) throw new Error('No se pudo generar el enlace de descarga.')
    return `${SUPABASE_URL}/storage/v1${data.signedURL}`
}

function obtenerUserId() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.user)
        return raw ? JSON.parse(raw)?.id || null : null
    } catch { return null }
}

async function storageRequest(path, options = {}) {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken)
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), TIMEOUT)
    try {
        const res = await fetch(`${SUPABASE_URL}/storage/v1${path}`, {
            method: options.method || 'GET',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            signal: ctrl.signal
        })
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
