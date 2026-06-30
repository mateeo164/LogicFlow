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
                return
            }

            mostrarMensajeGlobal(mensajeGlobal, resultado.mensaje || '✓ Cuenta creada correctamente.', 'success')
            form.reset()
        } finally {
            setBotonCargando(btnSubmit, false, 'Crear Cuenta y Continuar', 'Creando cuenta...')
        }
    })
})

