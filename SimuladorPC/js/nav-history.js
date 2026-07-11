// Barra flotante de navegación (atrás / adelante / inicio), presente en
// todas las páginas para no depender de los botones del navegador — clave
// en la PWA instalada, donde no hay chrome de navegador visible.
// Standalone: no depende de ningún otro script de la página.
(function () {
    function icono(pathInterno) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${pathInterno}</svg>`
    }
    const ICONO_ATRAS = icono('<polyline points="15 18 9 12 15 6"/>')
    const ICONO_ADELANTE = icono('<polyline points="9 18 15 12 9 6"/>')
    const ICONO_INICIO = icono('<path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/>')

    function crearBarra() {
        if (document.getElementById('lf-navhist')) return

        const barra = document.createElement('div')
        barra.id = 'lf-navhist'
        barra.className = 'lf-navhist'
        barra.innerHTML = `
            <button type="button" class="lf-navhist__btn" id="lf-nav-atras" aria-label="Página anterior" title="Atrás">${ICONO_ATRAS}</button>
            <button type="button" class="lf-navhist__btn" id="lf-nav-adelante" aria-label="Página siguiente" title="Adelante">${ICONO_ADELANTE}</button>
            <button type="button" class="lf-navhist__btn lf-navhist__btn--inicio" id="lf-nav-inicio" aria-label="Ir al inicio" title="Inicio">${ICONO_INICIO}</button>
        `
        document.body.appendChild(barra)

        const btnAtras = barra.querySelector('#lf-nav-atras')
        const btnAdelante = barra.querySelector('#lf-nav-adelante')
        const btnInicio = barra.querySelector('#lf-nav-inicio')

        // No existe una API estándar para saber si hay historial "adelante";
        // solo deshabilitamos "atrás" cuando el largo total de la sesión
        // indica que esta pestaña arrancó en esta misma página.
        if (window.history.length <= 1) btnAtras.disabled = true

        const paginaActual = location.pathname.split('/').pop() || 'index.html'
        if (paginaActual === 'index.html') btnInicio.disabled = true

        btnAtras.addEventListener('click', () => window.history.back())
        btnAdelante.addEventListener('click', () => window.history.forward())
        btnInicio.addEventListener('click', () => { window.location.href = 'index.html' })
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', crearBarra)
    } else {
        crearBarra()
    }
})()
