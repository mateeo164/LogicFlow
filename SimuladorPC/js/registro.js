import { registrarUsuario, redirigirSiAutenticado } from './auth.js'
import {
    mostrarMensajeGlobal,
    ocultarMensajeGlobal,
    setBotonCargando,
    mostrarErroresCampos,
    limpiarErroresCampos,
    establecerValidacionTiempoReal
} from './auth-ui.js'
import {
    validarFormularioRegistro,
    validarNombre,
    validarCorreo,
    validarContrasena,
    validarConfirmacion,
    validarRol
} from './auth-validations.js'

document.addEventListener('DOMContentLoaded', function() {

    redirigirSiAutenticado()

    const form = document.getElementById('form-registro')
    const mensajeGlobal = document.getElementById('auth-mensaje')
    const btnSubmit = form?.querySelector('button[type="submit"]')

    if (!form) return

    establecerValidacionTiempoReal('nombres', validarNombre)
    establecerValidacionTiempoReal('correo', validarCorreo)
    establecerValidacionTiempoReal('password', validarContrasena)
    establecerValidacionTiempoReal('confirm_password', (valor) => {
        const password = document.getElementById('password')?.value || ''
        return validarConfirmacion(password, valor)
    })
    // Si el usuario ya escribió la confirmación y vuelve a editar la contraseña,
    // revalida la confirmación en vez de dejarla "sin error" aunque ya no coincidan
    // (antes solo se revalidaba al tocar confirm_password, no al tocar password).
    document.getElementById('password')?.addEventListener('input', () => {
        const confirmInput = document.getElementById('confirm_password')
        if (confirmInput?.value) confirmInput.dispatchEvent(new Event('blur'))
    })

    form.addEventListener('submit', async function(e) {
        e.preventDefault()
        ocultarMensajeGlobal(mensajeGlobal)
        limpiarErroresCampos()

        const datos = {
            nombres: document.getElementById('nombres')?.value?.trim() || '',
            correo: document.getElementById('correo')?.value?.trim() || '',
            institucion: document.getElementById('institucion')?.value?.trim() || '',
            password: document.getElementById('password')?.value || '',
            confirm_password: document.getElementById('confirm_password')?.value || '',
            rol: document.querySelector('input[name="rol"]:checked')?.value || 'Estudiante'
        }

        const validacion = validarFormularioRegistro(datos)
        if (!validacion.valido) {
            mostrarErroresCampos(validacion.errores)
            mostrarMensajeGlobal(mensajeGlobal, '✗ Corrige los campos marcados para crear tu cuenta.', 'error')
            return
        }

        setBotonCargando(btnSubmit, true, 'Crear Cuenta y Continuar', 'Creando cuenta...')
        try {
            const resultado = await registrarUsuario({
                nombres: validacion.datos.nombres,
                correo: validacion.datos.correo,
                institucion: validacion.datos.institucion,
                password: validacion.datos.password,
                confirm_password: datos.confirm_password,
                rol: validacion.datos.rol
            })

            if (!resultado.exito) {
                mostrarMensajeGlobal(mensajeGlobal, resultado.mensaje || '✗ No se pudo crear la cuenta.', 'error')
                setBotonCargando(btnSubmit, false, 'Crear Cuenta y Continuar', 'Creando cuenta...')
                return
            }

            mostrarMensajeGlobal(mensajeGlobal, resultado.mensaje || '✓ Cuenta creada correctamente.', 'success')
            form.reset()

            // Si el proyecto de Supabase tiene la confirmación por correo desactivada,
            // registrarUsuario() ya guardó una sesión activa (requiereConfirmacion es
            // falso): sin este redirect el estudiante quedaba autenticado pero varado
            // en el formulario de registro vacío, sin ningún CTA para continuar.
            if (!resultado.requiereConfirmacion) {
                window.setTimeout(() => { window.location.href = 'menu.html' }, 600)
            } else {
                setBotonCargando(btnSubmit, false, 'Crear Cuenta y Continuar', 'Creando cuenta...')
            }
        } catch (err) {
            setBotonCargando(btnSubmit, false, 'Crear Cuenta y Continuar', 'Creando cuenta...')
            throw err
        }
    })
})
