import { actualizarContrasena, establecerSesionDesdeHash, obtenerTipoDesdeHash, RUTA_CONFIRMAR_CUENTA } from './auth.js'
import { obtenerSesionGuardada, limpiarSesion } from './supabase-config.js'
import { validarContrasena, validarConfirmacion } from './auth-validations.js'
import {
    mostrarMensajeGlobal,
    ocultarMensajeGlobal,
    mostrarErroresCampos,
    limpiarErroresCampos,
    setBotonCargando,
    establecerValidacionTiempoReal
} from './auth-ui.js'

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-actualizar')
    const mensajeGlobal = document.getElementById('auth-mensaje')
    const btnSubmit = form?.querySelector('button[type="submit"]')
    const TEXTO_BTN = 'Guardar nueva contraseña'

    if (obtenerTipoDesdeHash() === 'signup') {
        window.location.replace(RUTA_CONFIRMAR_CUENTA + window.location.hash)
        return
    }

    establecerSesionDesdeHash()

    const session = obtenerSesionGuardada()
    if (!session?.access_token) {
        mostrarMensajeGlobal(
            mensajeGlobal,
            '✗ El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".',
            'error'
        )
        if (form) form.style.display = 'none'
        return
    }

    if (!form) return

    establecerValidacionTiempoReal('password', validarContrasena)
    establecerValidacionTiempoReal('confirm_password', (valor) => {
        const password = document.getElementById('password')?.value || ''
        return validarConfirmacion(password, valor)
    })
    document.getElementById('password')?.addEventListener('input', () => {
        const confirmInput = document.getElementById('confirm_password')
        if (confirmInput?.value) confirmInput.dispatchEvent(new Event('blur'))
    })

    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        ocultarMensajeGlobal(mensajeGlobal)
        limpiarErroresCampos()

        const password = form.password.value
        const confirmacion = form.confirm_password.value
        const errores = {}

        if (!password) errores.password = '✗ La contraseña es obligatoria.'
        if (!confirmacion) errores.confirm_password = '✗ Debes confirmar la contraseña.'

        if (Object.keys(errores).length === 0) {
            const valPassword = validarContrasena(password)
            if (!valPassword.valido) errores.password = valPassword.mensaje

            const valConfirm = validarConfirmacion(password, confirmacion)
            if (!valConfirm.valido) errores.confirm_password = valConfirm.mensaje
        }

        if (Object.keys(errores).length > 0) {
            mostrarErroresCampos(errores)
            mostrarMensajeGlobal(mensajeGlobal, '✗ Corrige los campos antes de continuar.', 'error')
            return
        }

        setBotonCargando(btnSubmit, true, TEXTO_BTN, 'Guardando...')
        try {
            const resultado = await actualizarContrasena(password)

            if (!resultado.exito) {
                mostrarMensajeGlobal(mensajeGlobal, resultado.mensaje, 'error')
                setBotonCargando(btnSubmit, false, TEXTO_BTN, 'Guardar nueva contraseña')
                return
            }

            mostrarMensajeGlobal(
                mensajeGlobal,
                '✓ ' + resultado.mensaje + ' Inicia sesión con tu nueva contraseña.',
                'success'
            )
            limpiarSesion()
            setTimeout(() => { window.location.href = 'login.html' }, 2200)
        } catch (err) {
            setBotonCargando(btnSubmit, false, TEXTO_BTN, 'Guardar nueva contraseña')
            throw err
        }
    })
})
