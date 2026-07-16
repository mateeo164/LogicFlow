import { establecerSesionDesdeHash, obtenerTipoDesdeHash, RUTA_USUARIO, RUTA_LOGIN } from './auth.js'
import { obtenerSesionGuardada } from './supabase-config.js'

document.addEventListener('DOMContentLoaded', () => {
    const titulo = document.getElementById('confirmar-titulo')
    const subtitulo = document.getElementById('confirmar-subtitulo')
    const icono = document.getElementById('confirmar-icono')
    const acciones = document.getElementById('confirmar-acciones')

    const tipo = obtenerTipoDesdeHash()

    const habiaHash = establecerSesionDesdeHash()
    const session = obtenerSesionGuardada()
    const autenticado = !!session?.access_token

    if (!habiaHash && !autenticado && tipo !== 'signup') {
        if (icono) icono.classList.add('confirmar-icono--error')
        if (titulo) titulo.textContent = 'Enlace no válido o expirado'
        if (subtitulo) {
            subtitulo.textContent =
                'Este enlace de confirmación no es válido o ya expiró. Intenta iniciar sesión; si tu cuenta aún no está confirmada, solicita un nuevo correo desde el registro.'
        }
        if (acciones) {
            acciones.innerHTML =
                `<a class="btn btn-primary auth-btn" href="${RUTA_LOGIN}">Ir al inicio de sesión</a>`
        }
        return
    }

    if (titulo) titulo.textContent = '¡Cuenta confirmada!'
    if (subtitulo) {
        subtitulo.textContent = autenticado
            ? 'Tu correo fue verificado correctamente. Ya iniciamos sesión por ti; en unos segundos te llevaremos a tu panel.'
            : 'Tu correo fue verificado correctamente. Ya puedes iniciar sesión con tu cuenta.'
    }

    if (acciones) {
        acciones.innerHTML = autenticado
            ? `<a class="btn btn-primary auth-btn" href="${RUTA_USUARIO}">Ir a mi panel</a>`
            : `<a class="btn btn-primary auth-btn" href="${RUTA_LOGIN}">Iniciar sesión</a>`
    }

    if (autenticado) {
        setTimeout(() => { window.location.href = RUTA_USUARIO }, 3500)
    }
})
