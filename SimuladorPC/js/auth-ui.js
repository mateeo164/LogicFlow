export function mostrarMensajeGlobal(contenedor, texto, tipo = 'error') {
    if (!contenedor) return
    contenedor.textContent = texto
    contenedor.className = `auth-message auth-message--${tipo}`
    contenedor.hidden = false
    contenedor.setAttribute('role', 'alert')
}

export function ocultarMensajeGlobal(contenedor) {
    if (!contenedor) return
    contenedor.hidden = true
    contenedor.textContent = ''
}

export function mostrarErrorCampo(idCampo, mensaje) {
    const input = document.getElementById(idCampo)
    if (!input) return

    const grupo = input.closest('.input-group')
    if (!grupo) return

    
    const errorAnterior = grupo.querySelector(`.field-error[data-error-for="${idCampo}"]`)
    if (errorAnterior) errorAnterior.remove()

    grupo.classList.add('input-group--error')
    const span = document.createElement('span')
    span.className = 'field-error'
    span.dataset.errorFor = idCampo
    span.textContent = mensaje
    span.setAttribute('role', 'alert')
    grupo.appendChild(span)
}

export function limpiarErrorCampo(idCampo) {
    const input = document.getElementById(idCampo)
    if (!input) return

    const grupo = input.closest('.input-group')
    if (!grupo) return

    const error = grupo.querySelector(`.field-error[data-error-for="${idCampo}"]`)
    if (error) error.remove()

    if (!grupo.querySelector('.field-error')) {
        grupo.classList.remove('input-group--error')
    }
}

export function mostrarErroresCampos(errores) {
    limpiarErroresCampos()
    Object.entries(errores).forEach(([campo, mensaje]) => {
        mostrarErrorCampo(campo, mensaje)
    })
}

export function limpiarErroresCampos() {
    document.querySelectorAll('.input-group--error').forEach(grupo => {
        grupo.classList.remove('input-group--error')
    })
    document.querySelectorAll('.field-error').forEach(el => el.remove())
}

export function setBotonCargando(boton, cargando, textoOriginal, textoCarga) {
    if (!boton) return
    boton.disabled = cargando
    boton.textContent = cargando ? textoCarga : textoOriginal
}

export function establecerValidacionTiempoReal(idCampo, funcionValidacion) {
    const input = document.getElementById(idCampo)
    if (!input) return

    
    input.addEventListener('blur', () => {
        const resultado = funcionValidacion(input.value)
        if (!resultado.valido && input.value.trim()) {
            mostrarErrorCampo(idCampo, resultado.mensaje)
        } else {
            limpiarErrorCampo(idCampo)
        }
    })

    
    input.addEventListener('input', () => {
        const grupo = input.closest('.input-group')
        if (grupo?.classList.contains('input-group--error')) {
            const resultado = funcionValidacion(input.value)
            if (resultado.valido) {
                limpiarErrorCampo(idCampo)
            }
        }
    })
}
