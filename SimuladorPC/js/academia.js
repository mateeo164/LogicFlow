// academia.js — Renderiza el hub de la Academia: módulos, lecciones y progreso.
import { MODULOS, LECCIONES, leccionesEnOrden } from './academia-data.js'
import { leerLocal, sincronizar } from './academia-api.js'

function iconoCheck() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
}

function renderModulos(completadas) {
  const cont = document.getElementById('academia-modulos')
  if (!cont) return

  const setHechas = new Set(completadas)

  cont.innerHTML = MODULOS.map((modulo, mi) => {
    const total = modulo.lecciones.length
    const hechas = modulo.lecciones.filter(id => setHechas.has(id)).length

    const cards = modulo.lecciones.map((id, i) => {
      const lec = LECCIONES[id]
      if (!lec) return ''
      const done = setHechas.has(id)
      return `
        <a class="leccion-card${done ? ' is-done' : ''}" href="leccion.html?id=${encodeURIComponent(id)}">
          <div class="leccion-card__icon" aria-hidden="true">${lec.icono || '📄'}</div>
          <div class="leccion-card__body">
            <span class="leccion-card__title">${lec.titulo}</span>
            <span class="leccion-card__sub">${lec.subtitulo || ''}</span>
            <span class="leccion-card__meta">
              <span class="leccion-card__time">⏱ ${lec.lectura || '—'}</span>
              ${lec.quiz ? '<span class="leccion-card__badge">Con mini-quiz</span>' : ''}
            </span>
          </div>
          <div class="leccion-card__state" aria-hidden="true">${done ? iconoCheck() : ''}</div>
        </a>`
    }).join('')

    return `
      <section class="academia-modulo" style="--mi:${mi}">
        <div class="academia-modulo__head">
          <div class="academia-modulo__title">
            <span class="academia-modulo__num">Módulo ${mi + 1}</span>
            <h2>${modulo.nombre}</h2>
            <p>${modulo.resumen}</p>
          </div>
          <span class="academia-modulo__count">${hechas}/${total}</span>
        </div>
        <div class="leccion-grid">${cards}</div>
      </section>`
  }).join('')
}

function renderProgreso(completadas) {
  const orden = leccionesEnOrden()
  const total = orden.length
  const setHechas = new Set(completadas)
  const hechas = orden.filter(l => setHechas.has(l.id)).length
  const pct = total ? Math.round((hechas / total) * 100) : 0

  const elHechas = document.getElementById('prog-hechas')
  const elTotal = document.getElementById('prog-total')
  const elFill = document.getElementById('prog-fill')
  if (elHechas) elHechas.textContent = hechas
  if (elTotal) elTotal.textContent = total
  if (elFill) elFill.style.width = pct + '%'

  // El botón "continuar" apunta a la primera lección no completada (o a la primera si todo está hecho).
  const btn = document.getElementById('btn-continuar')
  if (btn) {
    const siguiente = orden.find(l => !setHechas.has(l.id)) || orden[0]
    if (siguiente) btn.href = `leccion.html?id=${encodeURIComponent(siguiente.id)}`
    if (hechas === 0) btn.textContent = 'Empezar a aprender'
    else if (hechas >= total) btn.textContent = 'Repasar lecciones'
    else btn.textContent = 'Continuar donde quedaste'
  }
}

function pintar(completadas) {
  renderProgreso(completadas)
  renderModulos(completadas)
}

async function init() {
  // Render instantáneo desde el caché local (funciona sin sesión / sin red).
  pintar(leerLocal())
  // Luego fusiona con el servidor y vuelve a pintar si hubo cambios.
  try {
    const sincronizadas = await sincronizar()
    pintar(sincronizadas)
  } catch (e) { /* sin conexión: nos quedamos con lo local */ }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
