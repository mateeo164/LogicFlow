const SUPABASE_URL = 'https://kgyhbimpwwtnkiozymyr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtneWhiaW1wd3d0bmtpb3p5bXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjUxMDEsImV4cCI6MjA5NjcwMTEwMX0.Ob03jI480Wc6dAxOgyXP3HgPd9sKrFtApFdhvsXaIj8'

const REQUEST_TIMEOUT = 15000

const STORAGE_KEYS = {
    accessToken: 'logicflow_access_token',
    refreshToken: 'logicflow_refresh_token',
    user: 'logicflow_user',
    expiresAt: 'logicflow_expires_at'
}

const ERROR_CODES = {
    network: 'NETWORK_ERROR',
    timeout: 'TIMEOUT_ERROR'
}

// La sesión vive en sessionStorage: se limpia automáticamente cuando el usuario
// cierra la pestaña, de modo que no queda una sesión "abierta" de forma
// permanente. Las preferencias (tema, progreso local, etc.) siguen en
// localStorage porque no dependen de la sesión.
const authStore = window.sessionStorage

// Limpieza de sesiones heredadas: en versiones anteriores el token se guardaba
// en localStorage y quedaba abierto indefinidamente, lo que provocaba estados
// inconsistentes (p. ej. la landing mostrando "Iniciar sesión" con la sesión
// abierta). Borramos esas claves para que no reaparezcan.
function purgarSesionLegacy() {
    try {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
    } catch (error) {
        // localStorage puede no estar disponible (modo privado estricto).
    }
}

purgarSesionLegacy()

function getAuthHeaders(extra = {}) {
    const headers = {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(extra.headers || {})
    }

    const accessToken = authStore.getItem(STORAGE_KEYS.accessToken)
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
    }

    return headers
}

function crearError(mensaje, code = null) {
    const error = new Error(mensaje)
    if (code) error.code = code
    return error
}

export async function supabaseAuthRequest(path, options = {}) {
    const { _reintentado = false, ...resto } = options

    let response
    const controlador = new AbortController()
    const timeoutId = setTimeout(() => controlador.abort(), REQUEST_TIMEOUT)

    try {
        response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
            method: resto.method || 'GET',
            headers: getAuthHeaders(resto),
            body: resto.body ? JSON.stringify(resto.body) : undefined,
            signal: controlador.signal
        })
    } catch (error) {

        if (error.name === 'AbortError') {
            throw crearError(
                'La conexión tardó demasiado. Revisa tu internet e inténtalo de nuevo.',
                ERROR_CODES.timeout
            )
        }
        throw crearError(
            'No se pudo conectar con el servidor. Verifica tu conexión a internet e inténtalo de nuevo.',
            ERROR_CODES.network
        )
    } finally {
        clearTimeout(timeoutId)
    }

    let payload = null
    try {
        payload = await response.json()
    } catch (error) {
        payload = null
    }

    if (!response.ok) {

        if (response.status === 401 && !_reintentado && authStore.getItem(STORAGE_KEYS.refreshToken)) {
            const refrescada = await refreshSession()
            if (refrescada) {
                return supabaseAuthRequest(path, { ...resto, _reintentado: true })
            }
        }

        const mensaje =
            payload?.msg ||
            payload?.error_description ||
            payload?.message ||
            payload?.error ||
            'No se pudo completar la solicitud.'
        throw crearError(mensaje)
    }

    return payload
}

export async function refreshSession() {
    const refreshToken = authStore.getItem(STORAGE_KEYS.refreshToken)
    if (!refreshToken) return false

    // A diferencia de supabaseAuthRequest, este fetch no tenía AbortController: en
    // una red que "cuelga" la conexión sin cerrarla, protegerRuta() (que llama a
    // refreshSession antes de mostrar cualquier página) podía quedar esperando
    // indefinidamente en vez de fallar y mostrar el error de red esperado.
    const controlador = new AbortController()
    const timeoutId = setTimeout(() => controlador.abort(), REQUEST_TIMEOUT)

    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
            signal: controlador.signal
        })

        if (!response.ok) {
            limpiarSesion()
            return false
        }

        const data = await response.json()
        guardarSesion(data)
        return true
    } catch (error) {

        return false
    } finally {
        clearTimeout(timeoutId)
    }
}

export function guardarSesion(session) {
    if (!session) return

    if (session.access_token) {
        authStore.setItem(STORAGE_KEYS.accessToken, session.access_token)
    }

    if (session.refresh_token) {
        authStore.setItem(STORAGE_KEYS.refreshToken, session.refresh_token)
    }

    if (session.user) {
        authStore.setItem(STORAGE_KEYS.user, JSON.stringify(session.user))
    }

    if (session.expires_at) {
        authStore.setItem(STORAGE_KEYS.expiresAt, String(session.expires_at))
    } else if (session.expires_in) {
        const expiraEn = Math.floor(Date.now() / 1000) + Number(session.expires_in)
        authStore.setItem(STORAGE_KEYS.expiresAt, String(expiraEn))
    }
}

export function limpiarSesion() {
    Object.values(STORAGE_KEYS).forEach(key => {
        authStore.removeItem(key)
    })
    // Barremos también posibles restos en localStorage (sesiones heredadas).
    purgarSesionLegacy()
}

export function obtenerSesionGuardada() {
    const accessToken = authStore.getItem(STORAGE_KEYS.accessToken)
    if (!accessToken) return null

    const refreshToken = authStore.getItem(STORAGE_KEYS.refreshToken)
    const userRaw = authStore.getItem(STORAGE_KEYS.user)
    const expiresAt = authStore.getItem(STORAGE_KEYS.expiresAt)

    let user = null
    try {
        user = userRaw ? JSON.parse(userRaw) : null
    } catch (error) {
        user = null
    }

    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt ? Number(expiresAt) : null,
        user
    }
}

function decodificarJwt(token) {
    try {
        const base = token.split('.')[1]
        const json = atob(base.replace(/-/g, '+').replace(/_/g, '/'))
        return JSON.parse(json)
    } catch (error) {
        return null
    }
}

export function tokenExpirado() {
    const ahora = Math.floor(Date.now() / 1000)
    const margen = 30

    const expiresAt = authStore.getItem(STORAGE_KEYS.expiresAt)
    if (expiresAt) {
        return Number(expiresAt) - margen <= ahora
    }

    const token = authStore.getItem(STORAGE_KEYS.accessToken)
    if (!token) return true

    // Sin expiresAt guardado y con un token que no se puede decodificar (o sin
    // "exp"), no hay forma de saber si sigue vigente: se trata como expirado
    // (falla cerrado) en vez de como sesión válida indefinida.
    const payload = decodificarJwt(token)
    if (!payload?.exp) return true
    return payload.exp - margen <= ahora
}

export function esErrorDeRed(error) {
    return error?.code === ERROR_CODES.network || error?.code === ERROR_CODES.timeout
}

export { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_KEYS, ERROR_CODES, authStore }
