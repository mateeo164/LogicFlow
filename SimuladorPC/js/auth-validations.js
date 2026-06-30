const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{2,60}$/
const INSTITUCION_REGEX = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,-]{0,100}$/

export function validarNombre(nombre) {
    const valor = nombre ? nombre.trim() : ''
    if (!valor) return { valido: false, mensaje: '✗ El nombre completo es obligatorio.' }
    if (valor.length < 2) return { valido: false, mensaje: '✗ El nombre debe tener al menos 2 caracteres.' }
    if (valor.length > 60) return { valido: false, mensaje: '✗ El nombre no puede exceder 60 caracteres.' }
    if (!NAME_REGEX.test(valor)) return { valido: false, mensaje: '✗ El nombre solo puede contener letras y espacios.' }
    return { valido: true, valor }
}

export function validarCorreo(correo) {
    const valor = correo ? correo.trim().toLowerCase() : ''
    if (!valor) return { valido: false, mensaje: '✗ El correo electrónico es obligatorio.' }
    if (valor.length > 254) return { valido: false, mensaje: '✗ El correo es demasiado largo.' }
    if (!EMAIL_REGEX.test(valor)) return { valido: false, mensaje: '✗ Formato de correo inválido. Usa: usuario@dominio.com' }
    return { valido: true, valor }
}

export function validarInstitucion(institucion) {
    const valor = institucion ? institucion.trim() : ''
    if (valor.length > 100) return { valido: false, mensaje: '✗ La institución no puede exceder 100 caracteres.' }
    if (valor && !INSTITUCION_REGEX.test(valor)) return { valido: false, mensaje: '✗ Caracteres no válidos en institución.' }
    return { valido: true, valor: valor || null }
}

export function validarContrasena(password) {
    if (!password) return { valido: false, mensaje: '✗ La contraseña es obligatoria.' }
    if (password.length < 8) return { valido: false, mensaje: '✗ Mínimo 8 caracteres.' }
    if (password.length > 128) return { valido: false, mensaje: '✗ La contraseña es muy larga.' }
    if (!/[a-z]/.test(password)) return { valido: false, mensaje: '✗ Necesita letra minúscula (a-z).' }
    if (!/[A-Z]/.test(password)) return { valido: false, mensaje: '✗ Necesita letra mayúscula (A-Z).' }
    if (!/[0-9]/.test(password)) return { valido: false, mensaje: '✗ Necesita al menos un número (0-9).' }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return { valido: false, mensaje: '✗ Necesita carácter especial (!@#$%...).' }
    if (!/^\S+$/.test(password)) return { valido: false, mensaje: '✗ La contraseña no puede contener espacios.' }
    return { valido: true, valor: password }
}

export function validarRol(rol) {
    const valor = rol ? rol.trim() : ''
    if (!valor) return { valido: false, mensaje: '✗ Selecciona un rol: Estudiante o Tutor.' }
    if (!['Estudiante', 'Tutor'].includes(valor)) return { valido: false, mensaje: '✗ Rol inválido.' }
    return { valido: true, valor }
}

export function validarConfirmacion(password, confirmacion) {
    if (!confirmacion) return { valido: false, mensaje: '✗ Debe confirmar la contraseña.' }
    if (!password) return { valido: false, mensaje: '✗ Primero ingresa la contraseña.' }
    if (password !== confirmacion) return { valido: false, mensaje: '✗ Las contraseñas no coinciden.' }
    return { valido: true }
}

export function validarFormularioRegistro(datos) {
    const errores = {}

    
    if (!datos.nombres) errores.nombres = '✗ El nombre completo es obligatorio.'
    if (!datos.correo) errores.correo = '✗ El correo electrónico es obligatorio.'
    if (!datos.password) errores.password = '✗ La contraseña es obligatoria.'
    if (!datos.confirm_password) errores.confirm_password = '✗ Debe confirmar la contraseña.'

    
    if (Object.keys(errores).length > 0) {
        return {
            valido: false,
            errores,
            datos: { nombres: '', correo: '', institucion: '', password: '' }
        }
    }

    const nombre = validarNombre(datos.nombres)
    if (!nombre.valido) errores.nombres = nombre.mensaje

    const correo = validarCorreo(datos.correo)
    if (!correo.valido) errores.correo = correo.mensaje

    const institucion = validarInstitucion(datos.institucion)
    if (!institucion.valido) errores.institucion = institucion.mensaje

    const password = validarContrasena(datos.password)
    if (!password.valido) errores.password = password.mensaje

    const confirmacion = validarConfirmacion(datos.password, datos.confirm_password)
    if (!confirmacion.valido) errores.confirm_password = confirmacion.mensaje

    const rol = validarRol(datos.rol)
    if (!rol.valido) errores.rol = rol.mensaje

    return {
        valido: Object.keys(errores).length === 0,
        errores,
        datos: {
            nombres: nombre.valor || '',
            correo: correo.valor || '',
            institucion: institucion.valor || '',
            password: datos.password,
            rol: rol.valor || 'Estudiante'
        }
    }
}

export function validarFormularioLogin(datos) {
    const errores = {}

    
    if (!datos.correo) errores.correo = '✗ El correo electrónico es obligatorio.'
    if (!datos.password) errores.password = '✗ La contraseña es obligatoria.'

    
    if (Object.keys(errores).length > 0) {
        return {
            valido: false,
            errores,
            datos: { correo: '', password: '' }
        }
    }

    const correo = validarCorreo(datos.correo)
    if (!correo.valido) errores.correo = correo.mensaje

    if (!datos.password) errores.password = '✗ La contraseña es obligatoria.'

    return {
        valido: Object.keys(errores).length === 0,
        errores,
        datos: { 
            correo: correo.valor || '', 
            password: datos.password 
        }
    }
}
