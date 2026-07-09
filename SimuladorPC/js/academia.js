// academia.js — Renderiza el hub de la Academia: módulos, lecciones y progreso.
import { MODULOS, LECCIONES, leccionesEnOrden } from './academia-data.js'
import { leerLocal, leerAciertos, sincronizar, estadoAcademia } from './academia-api.js'

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

// Bloquea o libera un enlace al laboratorio 3D según la aprobación de la Academia.
function fijarCandadoLab(el, aprobada) {
  if (!el) return
  if (aprobada) {
    el.classList.remove('is-locked')
    el.removeAttribute('aria-disabled')
    el.setAttribute('href', 'juego.html')
    el.title = ''
  } else {
    el.classList.add('is-locked')
    el.setAttribute('aria-disabled', 'true')
    // Apunta a la propia Academia con el aviso, en vez de rebotar desde el sim.
    el.setAttribute('href', 'academia.html?bloqueo=sim')
    el.title = 'Completa la Academia con buena calificación para desbloquearlo'
  }
}

// Renderiza la tarjeta de "desbloqueo del laboratorio 3D" y bloquea los CTA.
function renderGate(completadas) {
  const est = estadoAcademia(completadas, leerAciertos())

  const icon = document.getElementById('gate-icon')
  const title = document.getElementById('gate-title')
  const desc = document.getElementById('gate-desc')
  const elLec = document.getElementById('gate-lecciones')
  const elNota = document.getElementById('gate-nota')
  const gateBtn = document.getElementById('gate-btn')
  const card = document.getElementById('academia-gate')

  if (elLec) elLec.textContent = `${est.leccionesCompletadas}/${est.totalLecciones}`
  if (elNota) elNota.textContent = est.notaSobre10.toFixed(1)

  if (est.aprobada) {
    if (card) card.classList.add('is-unlocked')
    if (icon) icon.textContent = '🎉'
    if (title) title.textContent = '¡Laboratorio 3D desbloqueado!'
    if (desc) desc.textContent = `Completaste la Academia con ${est.notaSobre10.toFixed(1)}/10. Ya puedes ensamblar tu PC en el simulador.`
    if (gateBtn) gateBtn.hidden = false
  } else {
    if (card) card.classList.remove('is-unlocked')
    if (icon) icon.textContent = '🔒'
    if (title) title.textContent = 'Desbloquea el laboratorio 3D'
    if (gateBtn) gateBtn.hidden = true
    const faltaLeer = !est.todoLeido
    const faltaNota = !est.buenaNota
    if (desc) {
      if (faltaLeer && faltaNota) {
        desc.textContent = `Termina las ${est.totalLecciones} lecciones y alcanza al menos ${est.notaMinima.toFixed(1)}/10 en los mini-quiz para practicar en el simulador.`
      } else if (faltaLeer) {
        desc.textContent = `Ya tienes buena nota. Solo faltan lecciones por leer para desbloquear el laboratorio 3D.`
      } else {
        desc.textContent = `Leíste todo, pero necesitas al menos ${est.notaMinima.toFixed(1)}/10 en los mini-quiz. Repasa las lecciones con quiz y vuelve a intentarlo.`
      }
    }
  }

  // Bloquea/libera los CTA que llevan al laboratorio.
  fijarCandadoLab(document.getElementById('siguiente-lab-btn'), est.aprobada)

  // Muestra el aviso si el usuario llegó rebotado desde el simulador.
  const params = new URLSearchParams(window.location.search)
  if (params.get('bloqueo') === 'sim') {
    const aviso = document.getElementById('academia-bloqueo')
    const bnota = document.getElementById('bloqueo-nota')
    if (bnota) bnota.textContent = est.notaMinima.toFixed(1)
    if (aviso && !est.aprobada) aviso.hidden = false
  }
}

function pintar(completadas) {
  renderProgreso(completadas)
  renderModulos(completadas)
  renderGate(completadas)
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
