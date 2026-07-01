import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_KEYS } from './supabase-config.js'

const TIMEOUT = 12000
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin O/0/I/1 ambiguos

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

function generarCodigoClase() {
    let codigo = ''
    for (let i = 0; i < 6; i++) {
        codigo += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)]
    }
    return codigo
}

/** Crea una clase con un código único, reintentando ante colisión (23505). */
export async function crearClase({ nombre, descripcion }) {
    const userId = getUserId()
    if (!userId || !nombre?.trim()) return null

    for (let intento = 0; intento < 5; intento++) {
        const codigo = generarCodigoClase()
        try {
            const [clase] = await dataRequest('/clases', {
                method: 'POST',
                headers: { Prefer: 'return=representation' },
                body: {
                    docente_id: userId,
                    nombre: nombre.trim(),
                    descripcion: descripcion?.trim() || null,
                    codigo
                }
            }) || []
            if (clase) return clase
        } catch (err) {
            if (!/duplicate|unique|23505/i.test(err.message || '')) {
                console.warn('[LogicFlow] Error creando clase:', err.message)
                return null
            }
            // colisión de código: reintenta con uno nuevo
        }
    }
    console.warn('[LogicFlow] No se pudo generar un código de clase único.')
    return null
}

export async function obtenerMisClases() {
    const userId = getUserId()
    if (!userId) return []
    try {
        const data = await dataRequest(`/clases?docente_id=eq.${userId}&order=created_at.desc`)
        return Array.isArray(data) ? data : []
    } catch (err) {
        console.warn('[LogicFlow] Error cargando clases:', err.message)
        return []
    }
}

export async function obtenerClase(claseId) {
    try {
        const data = await dataRequest(`/clases?id=eq.${claseId}&select=*`)
        return Array.isArray(data) ? (data[0] || null) : null
    } catch (err) {
        console.warn('[LogicFlow] Error cargando clase:', err.message)
        return null
    }
}

export async function obtenerClasePorCodigo(codigo) {
    if (!codigo?.trim()) return null
    try {
        const data = await dataRequest(
            `/clases?codigo=eq.${encodeURIComponent(codigo.trim().toUpperCase())}&activa=eq.true&select=id,nombre,docente_id`
        )
        return Array.isArray(data) ? (data[0] || null) : null
    } catch (err) {
        console.warn('[LogicFlow] Error buscando clase por código:', err.message)
        return null
    }
}

export async function desactivarClase(claseId) {
    try {
        await dataRequest(`/clases?id=eq.${claseId}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: { activa: false, updated_at: new Date().toISOString() }
        })
        return true
    } catch (err) {
        console.warn('[LogicFlow] Error desactivando clase:', err.message)
        return false
    }
}

/** Matricula al usuario actual en la clase cuyo código coincide. */
export async function unirseAClase(codigo) {
    const userId = getUserId()
    if (!userId) return { exito: false, mensaje: 'Debes iniciar sesión.' }

    const clase = await obtenerClasePorCodigo(codigo)
    if (!clase) return { exito: false, mensaje: 'No existe una clase activa con ese código.' }

    try {
        await dataRequest('/matriculas', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: { clase_id: clase.id, estudiante_id: userId }
        })
        return { exito: true, clase }
    } catch (err) {
        if (/duplicate|unique|23505/i.test(err.message || '')) {
            return { exito: true, clase, yaMatriculado: true }
        }
        console.warn('[LogicFlow] Error al unirse a la clase:', err.message)
        return { exito: false, mensaje: 'No se pudo unir a la clase. Intenta de nuevo.' }
    }
}

export async function eliminarEstudianteDeClase(matriculaId) {
    try {
        await dataRequest(`/matriculas?id=eq.${matriculaId}`, {
            method: 'DELETE',
            headers: { Prefer: 'return=minimal' }
        })
        return true
    } catch (err) {
        console.warn('[LogicFlow] Error quitando estudiante:', err.message)
        return false
    }
}

/**
 * Roster de una clase: matrículas + perfil + progreso de cada estudiante.
 * No hay FK directa matriculas→profiles, así que se combinan 3 requests
 * simples en paralelo en vez de forzar un embed de PostgREST.
 */
export async function obtenerRoster(claseId) {
    try {
        const matriculas = await dataRequest(`/matriculas?clase_id=eq.${claseId}&select=id,estudiante_id,created_at`)
        const lista = Array.isArray(matriculas) ? matriculas : []
        if (lista.length === 0) return []

        const ids = lista.map(m => m.estudiante_id)
        const idsFiltro = `(${ids.join(',')})`

        const [perfiles, progresos] = await Promise.all([
            dataRequest(`/profiles?id=in.${idsFiltro}&select=id,full_name,email,institucion`).catch(() => []),
            dataRequest(
                `/progreso_usuario?user_id=in.${idsFiltro}&select=user_id,ensamble_web_nota,ensamble_web_aprobado,ensamble_real_instalados,ensamble_real_completado_at,completed_at`
            ).catch(() => [])
        ])

        const perfilPorId = new Map((perfiles || []).map(p => [p.id, p]))
        const progresoPorId = new Map((progresos || []).map(p => [p.user_id, p]))

        return lista.map(m => ({
            matriculaId: m.id,
            estudianteId: m.estudiante_id,
            matriculadoEn: m.created_at,
            perfil: perfilPorId.get(m.estudiante_id) || null,
            progreso: progresoPorId.get(m.estudiante_id) || null
        }))
    } catch (err) {
        console.warn('[LogicFlow] Error cargando roster:', err.message)
        return []
    }
}

export async function crearTarea({ claseId, categoria, titulo, descripcion, tipoMeta, metaValor, xpBonus, fechaLimite }) {
    if (!claseId || !titulo?.trim()) return null
    try {
        const [tarea] = await dataRequest('/clase_tareas', {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: {
                clase_id: claseId,
                categoria,
                titulo: titulo.trim(),
                descripcion: descripcion?.trim() || null,
                tipo_meta: tipoMeta,
                meta_valor: tipoMeta === 'web_nota_minima' ? Number(metaValor) : null,
                xp_bonus: categoria === 'reto' ? Math.max(0, Math.round(Number(xpBonus) || 0)) : 0,
                fecha_limite: categoria === 'deber' && fechaLimite ? new Date(fechaLimite).toISOString() : null
            }
        }) || []
        return tarea || null
    } catch (err) {
        console.warn('[LogicFlow] Error creando tarea:', err.message)
        return null
    }
}

export async function obtenerTareas(claseId, categoria) {
    try {
        const filtroCategoria = categoria ? `&categoria=eq.${categoria}` : ''
        const data = await dataRequest(`/clase_tareas?clase_id=eq.${claseId}${filtroCategoria}&activo=eq.true&order=created_at.desc`)
        return Array.isArray(data) ? data : []
    } catch (err) {
        console.warn('[LogicFlow] Error cargando tareas:', err.message)
        return []
    }
}

export async function eliminarTarea(tareaId) {
    try {
        await dataRequest(`/clase_tareas?id=eq.${tareaId}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: { activo: false, updated_at: new Date().toISOString() }
        })
        return true
    } catch (err) {
        console.warn('[LogicFlow] Error eliminando tarea:', err.message)
        return false
    }
}

/**
 * ¿Un estudiante (fila de progreso_usuario) cumple una tarea? Única fuente
 * de verdad para esta regla — la usan tanto el detalle por estudiante como
 * el contador agregado del roster.
 */
export function calcularCumplimiento(tarea, progreso) {
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
