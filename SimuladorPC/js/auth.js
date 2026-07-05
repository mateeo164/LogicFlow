import {
    validarFormularioRegistro,
    validarFormularioLogin,
    validarCorreo,
    validarContrasena
} from './auth-validations.js'
import {
    supabaseAuthRequest,
    guardarSesion,
    limpiarSesion,
    obtenerSesionGuardada,
    refreshSession,
    tokenExpirado,
    esErrorDeRed
} from './supabase-config.js'

const RUTA_USUARIO = 'menu.html'
const RUTA_LOGIN = 'login.html'
const RUTA_ACTUALIZAR_PASSWORD = 'actualizar-password.html'
const RUTA_CONFIRMAR_CUENTA = 'confirmar-cuenta.html'

function traducirErrorSupabase(mensaje) {
    const errores = {
        'Invalid login credentials': '✗ Correo o contraseña incorrectos. Verifica tus datos.',
        'User already registered': '✗ Este correo ya está registrado. Inicia sesión o recupera tu contraseña.',
        'Email not confirmed': '✗ Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada y spam.',
        'Password should be at least 6 characters': '✗ La contraseña debe tener al menos 8 caracteres.',
        'Unable to validate email address: invalid format': '✗ El formato del correo electrónico no es válido.',
        'Signup requires a valid password': '✗ Debes ingresar una contraseña válida.',
        'For security purposes, you can only request this once every 60 seconds': '✗ Por seguridad, espera 60 segundos antes de solicitar otro correo.',
        'Invalid Refresh Token': '✗ Tu sesión ha expirado. Inicia sesión nuevamente.',
        'Refresh Token Not Found': '✗ Debes iniciar sesión nuevamente.',
        'Unauthorized': '✗ No autorizado. Verifica tu sesión.',
        'User not found': '✗ Usuario no encontrado.',
        'New password should be different from the old password.': '✗ La nueva contraseña debe ser diferente a la anterior.',
        'over_email_send_rate_limit': '✗ Supabase está bloqueando el envío de correos por exceso de solicitudes. Espera unos minutos e intenta de nuevo.',
        'email rate limit exceeded': '✗ Supabase está bloqueando el envío de correos por exceso de solicitudes. Espera unos minutos e intenta de nuevo.'
    }

    return errores[mensaje] || mensaje || '✗ Ocurrió un error inesperado. Intenta de nuevo.'
}

function manejarErrorAutenticacion(error) {
    if (!error) return { exito: false, mensaje: '✗ Ocurrió un error inesperado. Intenta de nuevo.' }

    if (esErrorDeRed(error)) {
        return { exito: false, mensaje: `✗ ${error.message}`, esRed: true }
    }

    const mensaje = error?.message || String(error)
    return { exito: false, mensaje: traducirErrorSupabase(mensaje) }
}

export async function registrarUsuario(datos) {
    const validacion = validarFormularioRegistro(datos)
    if (!validacion.valido) {
        return { exito: false, errores: validacion.errores }
    }

    const { correo, password, nombres, institucion, rol } = validacion.datos

    const redirectConfirmacion = new URL(RUTA_CONFIRMAR_CUENTA, window.location.href).href

    try {
        const response = await supabaseAuthRequest(`/signup?redirect_to=${encodeURIComponent(redirectConfirmacion)}`, {
            method: 'POST',
            body: {
                email: correo,
                password,
                data: {
                    full_name: nombres,
                    institucion: institucion || null,
                    rol: rol || 'Estudiante'
                }
            }
        })

        if (response.session) {
            guardarSesion(response.session)
        }

        if (response.user && !response.session) {
            return {
                exito: true,
                requiereConfirmacion: true,
                mensaje: 'Cuenta creada exitosamente. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.'
            }
        }

        return { exito: true, mensaje: 'Cuenta creada correctamente.', usuario: response.user }
    } catch (error) {
        return manejarErrorAutenticacion(error)
    }
}

export async function iniciarSesion(datos) {
    const validacion = validarFormularioLogin(datos)
    if (!validacion.valido) {
        return { exito: false, errores: validacion.errores }
    }

    const { correo, password } = validacion.datos

    try {
        const response = await supabaseAuthRequest('/token?grant_type=password', {
            method: 'POST',
            body: {
                email: correo,
                password
            }
        })

        guardarSesion(response)
        return { exito: true, mensaje: 'Sesión iniciada correctamente.', usuario: response.user }
    } catch (error) {
        return manejarErrorAutenticacion(error)
    }
}

export async function recuperarContrasena(correo) {
    const validacion = validarCorreo(correo)
    if (!validacion.valido) {
        return { exito: false, mensaje: validacion.mensaje }
    }

    const redirectTo = new URL(RUTA_ACTUALIZAR_PASSWORD, window.location.href).href

    try {
        await supabaseAuthRequest(`/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
            method: 'POST',
            body: {
                email: validacion.valor
            }
        })

        return {
            exito: true,
            mensaje: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en tu bandeja de entrada y/o carpeta de spam.'
        }
    } catch (error) {
        return manejarErrorAutenticacion(error)
    }
}

export async function actualizarContrasena(nuevaPassword) {
    const validacion = validarContrasena(nuevaPassword)
    if (!validacion.valido) {
        return { exito: false, mensaje: validacion.mensaje }
    }

    try {
        const session = obtenerSesionGuardada()
        if (!session?.access_token) {
            return { exito: false, mensaje: '✗ Debes iniciar sesión nuevamente para cambiar tu contraseña.' }
        }

        await supabaseAuthRequest('/user', {
            method: 'PUT',
            body: {
                password: nuevaPassword
            }
        })

        return { exito: true, mensaje: 'Contraseña actualizada correctamente.' }
    } catch (error) {
        return manejarErrorAutenticacion(error)
    }
}

export function obtenerTipoDesdeHash() {
    const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : ''
    if (!hash) return null

    const params = new URLSearchParams(hash)
    return params.get('type')
}

export function establecerSesionDesdeHash() {
    const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : ''
    if (!hash) return false

    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken) return false

    guardarSesion({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: params.get('expires_in') ? Number(params.get('expires_in')) : undefined
    })

    try {
        history.replaceState(null, '', window.location.pathname + window.location.search)
    } catch (error) {

    }

    return true
}

export async function cerrarSesion() {
    limpiarSesion()
    window.location.href = RUTA_LOGIN
}

export async function protegerRuta() {
    const session = obtenerSesionGuardada()
    if (!session?.access_token) {
        window.location.href = RUTA_LOGIN
        return null
    }

    if (tokenExpirado()) {
        const refrescada = await refreshSession()
        if (!refrescada) {
            limpiarSesion()
            window.location.href = RUTA_LOGIN
            return null
        }
        return obtenerSesionGuardada()
    }

    return session
}

export function redirigirSiAutenticado() {
    const session = obtenerSesionGuardada()
    if (session?.access_token && !tokenExpirado()) {
        window.location.href = RUTA_USUARIO
    }
}

export { RUTA_USUARIO, RUTA_LOGIN, RUTA_CONFIRMAR_CUENTA }
