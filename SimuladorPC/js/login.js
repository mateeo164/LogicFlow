import { iniciarSesion, redirigirSiAutenticado } from './auth.js'
import {
    mostrarMensajeGlobal,
    ocultarMensajeGlobal,
    setBotonCargando,
    mostrarErroresCampos,
    limpiarErroresCampos,
    establecerValidacionTiempoReal
} from './auth-ui.js'
import { validarFormularioLogin, validarCorreo } from './auth-validations.js'

document.addEventListener('DOMContentLoaded', function() {

    redirigirSiAutenticado()

    const form = document.getElementById('form-login')
    const mensajeGlobal = document.getElementById('auth-mensaje')
    const btnSubmit = form?.querySelector('button[type="submit"]')

    if (!form) return

    establecerValidacionTiempoReal('correo', validarCorreo)
    establecerValidacionTiempoReal('password', (valor) => {
        if (!valor.trim()) return { valido: false, mensaje: '✗ La contraseña es obligatoria.' }
        return { valido: true, valor }
    })

    form.addEventListener('submit', async function(e) {
        e.preventDefault()
        ocultarMensajeGlobal(mensajeGlobal)
        limpiarErroresCampos()

        const datos = {
            correo: document.getElementById('correo')?.value?.trim() || '',
            password: document.getElementById('password')?.value || ''
        }

        const validacion = validarFormularioLogin(datos)
        if (!validacion.valido) {
            mostrarErroresCampos(validacion.errores)
            mostrarMensajeGlobal(mensajeGlobal, '✗ Corrige los campos marcados para continuar.', 'error')
            return
        }

        setBotonCargando(btnSubmit, true, 'Continuar', 'Iniciando sesión...')
        try {
            const resultado = await iniciarSesion({
                correo: validacion.datos.correo,
                password: validacion.datos.password
            })

            if (!resultado.exito) {
                mostrarMensajeGlobal(mensajeGlobal, resultado.mensaje || '✗ No se pudo iniciar sesión.', 'error')
                setBotonCargando(btnSubmit, false, 'Continuar', 'Iniciando sesión...')
                return
            }

            mostrarMensajeGlobal(mensajeGlobal, resultado.mensaje || '✓ Sesión iniciada correctamente.', 'success')
            form.reset()
            // El botón queda deshabilitado a propósito: ya vamos camino a menu.html.
            // Reactivarlo aquí permitía un doble submit en la ventana de 600ms, que con
            // el formulario ya reseteado mostraba un error de validación justo antes
            // de que la redirección (ya en curso) se completara.
            window.setTimeout(() => {
                window.location.href = 'menu.html'
            }, 600)
        } catch (err) {
            setBotonCargando(btnSubmit, false, 'Continuar', 'Iniciando sesión...')
            throw err
        }
    })
})
