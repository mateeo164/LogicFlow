import { protegerRuta } from './auth.js'
import { RETOS, LOGROS_RETO } from './retos-data.js'
import { obtenerResultadosRetos, resumirResultados, obtenerLogrosUsuario } from './retos-api.js'

function estrellas(n) {
    return '★'.repeat(n) + '☆'.repeat(3 - n)
}

function renderRetos(resumen) {
    const grid = document.getElementById('retos-grid')
    if (!grid) return

    grid.innerHTML = RETOS.map(r => {
        const res = resumen[r.id]
        let estadoHtml
        if (!res) {
            estadoHtml = `<span class="reto-card__nota--none">Sin intentos todavía</span>`
        } else if (res.exito) {
            estadoHtml = `<span class="reto-card__nota--ok">✓ Superado · mejor nota ${res.nota.toFixed(1)}/10</span>`
        } else {
            estadoHtml = `<span class="reto-card__nota--mal">Mejor nota ${res.nota.toFixed(1)}/10 · aún sin aprobar</span>`
        }
        return `
            <article class="reto-card">
                <div class="reto-card__top">
                    <span class="reto-card__icono">${r.icono}</span>
                    <span class="reto-card__dificultad" title="Dificultad">${estrellas(r.dificultad)}</span>
                </div>
                <h3>${r.titulo}</h3>
                <p class="reto-card__cliente">“${r.cliente}”</p>
                <div class="reto-card__estado">
                    ${estadoHtml}
                </div>
                <a href="juego.html?reto=${encodeURIComponent(r.id)}" class="btn btn-primary" style="width:100%;text-align:center;">
                    ${res?.exito ? '↻ Repetir reto' : '🔧 Entrar al taller'}
                </a>
            </article>`
    }).join('')
}

function renderLogros(desbloqueados) {
    const grid = document.getElementById('logros-grid')
    if (!grid) return
    grid.innerHTML = LOGROS_RETO.map(l => {
        const ok = desbloqueados.includes(l.id)
        return `
            <div class="logro-card ${ok ? '' : 'logro-card--locked'}" title="${ok ? 'Desbloqueado' : 'Bloqueado'}">
                <span class="logro-card__icono">${ok ? l.icono : '🔒'}</span>
                <div>
                    <strong>${l.titulo}</strong>
                    <span>${l.descripcion}</span>
                </div>
            </div>`
    }).join('')
}

function renderResumen(resumen, resultados, logros) {
    const superados = RETOS.filter(r => resumen[r.id]?.exito).length
    const mejor = resultados.length ? Math.max(...resultados.map(r => Number(r.nota) || 0)) : null

    const el = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v }
    el('rr-superados', `${superados} / ${RETOS.length}`)
    el('rr-mejor', mejor === null ? '—' : `${mejor.toFixed(1)}/10`)
    el('rr-logros', `${logros.length} / ${LOGROS_RETO.length}`)
}

async function init() {
    const session = await protegerRuta()
    if (!session) return

    renderRetos({})
    renderLogros([])

    const [resultados, logros] = await Promise.all([
        obtenerResultadosRetos(),
        obtenerLogrosUsuario()
    ])

    const resumen = resumirResultados(resultados)
    renderRetos(resumen)
    renderLogros(logros)
    renderResumen(resumen, resultados, logros)
}

document.addEventListener('DOMContentLoaded', init)
