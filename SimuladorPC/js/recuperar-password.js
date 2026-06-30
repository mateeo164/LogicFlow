import { recuperarContrasena, redirigirSiAutenticado } from './auth.js'
import {
    mostrarMensajeGlobal,
    ocultarMensajeGlobal,
    setBotonCargando,
    establecerValidacionTiempoReal,
    mostrarErroresCampos,
    limpiarErroresCampos
} from './auth-ui.js'
import { validarCorreo } from './auth-validations.js'

document.addEventListener('DOMContentLoaded', () => {
    redirigirSiAutenticado()

    const form = document.getElementById('form-recuperar')
    const mensajeGlobal = document.getElementById('auth-mensaje')
    const btnSubmit = form?.querySelector('button[type="submit"]')
    const TEXTO_BTN = 'Enviar enlace de recuperación'

    if (!form) return

    establecerValidacionTiempoReal('correo', validarCorreo)

    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        ocultarMensajeGlobal(mensajeGlobal)
        limpiarErroresCampos()

        const correo = (form.correo?.value || '').trim()
        const validacion = validarCorreo(correo)

        if (!validacion.valido) {
            mostrarErroresCampos({ correo: validacion.mensaje })
            mostrarMensajeGlobal(mensajeGlobal, '✗ Ingresa un correo válido para continuar.', 'error')
            return
        }

        setBotonCargando(btnSubmit, true, TEXTO_BTN, 'Enviando...')
        try {
            const resultado = await recuperarContrasena(validacion.valor)
            if (!resultado.exito) {
                mostrarMensajeGlobal(mensajeGlobal, resultado.mensaje, 'error')
                return
            }

            mostrarMensajeGlobal(mensajeGlobal, resultado.mensaje, 'success')
            form.reset()
        } finally {
            setBotonCargando(btnSubmit, false, TEXTO_BTN, 'Enviar enlace de recuperación')
        }
    })
})
