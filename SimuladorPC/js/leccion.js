import { LECCIONES, leccionesEnOrden } from './academia-data.js'
import { elegirPreguntaComponente } from './quiz-data.js'
import { leerLocal, completar, sincronizar, registrarQuiz } from './academia-api.js'

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function renderBloque(b) {
  switch (b.t) {
    case 'p':
      return `<p class="lec-p">${b.v}</p>`
    case 'h':
      return `<h2 class="lec-h">${b.v}</h2>`
    case 'ul':
      return `<ul class="lec-ul">${b.v.map(li => `<li>${li}</li>`).join('')}</ul>`
    case 'dato':
      return `<aside class="lec-callout lec-callout--dato"><span class="lec-callout__icon">💡</span><div><strong>¿Sabías qué?</strong> ${b.v}</div></aside>`
    case 'aviso':
      return `<aside class="lec-callout lec-callout--aviso"><span class="lec-callout__icon">⚠️</span><div><strong>Cuidado.</strong> ${b.v}</div></aside>`
    case 'specs': {
      const filas = Object.entries(b.v).map(([k, val]) => `
        <div class="lec-spec"><span>${escapeHtml(k)}</span><strong>${escapeHtml(val)}</strong></div>`).join('')
      return `<div class="lec-specs"><h3 class="lec-specs__title">Ficha técnica</h3>${filas}</div>`
    }
    default:
      return ''
  }
}

function renderQuiz(quizKey) {
  const q = elegirPreguntaComponente(quizKey)
  if (!q) return ''
  const opciones = q.opciones.map((op, i) => `
    <button type="button" class="quiz-opt" data-idx="${i}">
      <span class="quiz-opt__marker">${String.fromCharCode(65 + i)}</span>
      <span class="quiz-opt__text">${escapeHtml(op)}</span>
    </button>`).join('')
  return `
    <section class="lec-quiz" id="lec-quiz" data-correcta="${q.correcta}" data-explica="${escapeHtml(q.explica || '')}">
      <span class="lec-quiz__eyebrow">Comprueba lo aprendido</span>
      <h2 class="lec-quiz__pregunta">${escapeHtml(q.pregunta)}</h2>
      <div class="quiz-opts" id="quiz-opts">${opciones}</div>
      <div class="quiz-feedback" id="quiz-feedback" hidden>
        <p class="quiz-feedback__text"></p>
      </div>
    </section>`
}

function bindQuiz(id, onResuelto, onGuardado) {
  const quiz = document.getElementById('lec-quiz')
  if (!quiz) { onResuelto(false); return }
  const correcta = parseInt(quiz.dataset.correcta, 10)
  const opts = quiz.querySelectorAll('.quiz-opt')
  const feedback = document.getElementById('quiz-feedback')
  const explica = quiz.dataset.explica || ''
  let resuelto = false

  opts.forEach(btn => {
    btn.addEventListener('click', () => {
      if (resuelto) return
      resuelto = true
      const idx = parseInt(btn.dataset.idx, 10)
      const acierto = idx === correcta

      const { guardado } = registrarQuiz(id, acierto)
      if (onGuardado) onGuardado(guardado)

      opts.forEach(o => {
        o.disabled = true
        const oi = parseInt(o.dataset.idx, 10)
        if (oi === correcta) o.classList.add('is-correct')
        else if (o === btn) o.classList.add('is-wrong')
      })

      feedback.hidden = false
      feedback.classList.add(acierto ? 'is-ok' : 'is-err')
      feedback.querySelector('.quiz-feedback__text').innerHTML =
        `<strong>${acierto ? '¡Correcto! ' : 'No exactamente. '}</strong>${escapeHtml(explica)}`

      onResuelto(acierto)
    })
  })
}

function renderNav(orden, idx) {
  const prev = idx > 0 ? orden[idx - 1] : null
  const next = idx < orden.length - 1 ? orden[idx + 1] : null
  const prevHtml = prev
    ? `<a class="lec-nav__btn lec-nav__btn--prev" href="leccion.html?id=${encodeURIComponent(prev.id)}">
         <span class="lec-nav__dir">← Anterior</span><span class="lec-nav__name">${escapeHtml(prev.titulo)}</span></a>`
    : '<span></span>'
  const nextHtml = next
    ? `<a class="lec-nav__btn lec-nav__btn--next" href="leccion.html?id=${encodeURIComponent(next.id)}">
         <span class="lec-nav__dir">Siguiente →</span><span class="lec-nav__name">${escapeHtml(next.titulo)}</span></a>`
    : `<a class="lec-nav__btn lec-nav__btn--next" href="juego.html">
         <span class="lec-nav__dir">¡A practicar! →</span><span class="lec-nav__name">Laboratorio 3D</span></a>`
  return `<nav class="lec-nav">${prevHtml}${nextHtml}</nav>`
}

const CTA = {
  lab: { href: 'juego.html', label: 'Practicar en el laboratorio 3D', icon: '🧪' },
  retos: { href: 'retos.html', label: 'Ir a los Retos de reparación', icon: '🔧' },
  calculadora: { href: 'calculadora.html', label: 'Abrir la Calculadora PSU', icon: '⚡' }
}

function render404() {
  document.getElementById('leccion-main').innerHTML = `
    <div class="leccion-404">
      <h1>Lección no encontrada</h1>
      <p>Esta lección no existe o el enlace es incorrecto.</p>
      <a href="academia.html" class="btn btn-primary">Volver a la Academia</a>
    </div>`
}

function init() {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  const lec = id ? LECCIONES[id] : null
  const main = document.getElementById('leccion-main')
  if (!lec) { render404(); return }

  document.title = `${lec.titulo} — Academia LogicFlow`

  const orden = leccionesEnOrden()
  const idx = orden.findIndex(l => l.id === id)
  const info = orden[idx] || {}
  const completadas = new Set(leerLocal())
  const yaHecha = completadas.has(id)

  const bloques = lec.bloques.map(renderBloque).join('')

  const terminos = (lec.terminos && lec.terminos.length)
    ? `<div class="lec-terminos">
         <span class="lec-terminos__label">Términos de esta lección</span>
         <div class="lec-terminos__chips">
           ${lec.terminos.map(t => `<a class="lec-term-chip" href="glosario.html?q=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('')}
         </div>
       </div>`
    : ''

  const cta = lec.cta && CTA[lec.cta]
    ? `<a class="lec-cta" href="${CTA[lec.cta].href}">
         <span class="lec-cta__icon">${CTA[lec.cta].icon}</span>
         <span class="lec-cta__label">${CTA[lec.cta].label}</span>
         <span class="lec-cta__arrow">→</span>
       </a>`
    : ''

  main.innerHTML = `
    <article class="leccion-article">
      <div class="lec-breadcrumb">
        <a href="academia.html">Academia</a>
        <span>/</span>
        <span>${escapeHtml(info.moduloNombre || '')}</span>
      </div>

      <header class="lec-head">
        <div class="lec-head__icon" aria-hidden="true">${lec.icono || '📄'}</div>
        <div class="lec-head__text">
          <h1>${escapeHtml(lec.titulo)}</h1>
          <p class="lec-head__sub">${escapeHtml(lec.subtitulo || '')}</p>
          <div class="lec-head__meta">
            <span>⏱ ${escapeHtml(lec.lectura || '—')} de lectura</span>
            ${lec.marca ? `<span>·</span><span>${escapeHtml(lec.marca)}</span>` : ''}
            <span class="lec-done-tag${yaHecha ? '' : ' is-hidden'}" id="lec-done-tag">✓ Completada</span>
          </div>
        </div>
      </header>

      <div class="lec-body">
        ${bloques}
        ${terminos}
      </div>

      ${lec.quiz ? renderQuiz(lec.quiz) : ''}

      <div class="lec-actions">
        <button type="button" class="btn btn-primary btn-lg" id="btn-completar"${yaHecha ? ' disabled' : ''}>
          ${yaHecha ? '✓ Lección completada' : (lec.quiz ? 'Responde el quiz para completar' : 'Marcar como completada')}
        </button>
        ${cta}
      </div>

      ${renderNav(orden, idx)}
    </article>`

  const btn = document.getElementById('btn-completar')
  const doneTag = document.getElementById('lec-done-tag')

  const pendiente = { promise: Promise.resolve() }
  function avisarSiFalloGuardado(promesaGuardado) {
    pendiente.promise = promesaGuardado.then(ok => {
      if (ok === false && window.LFUI?.toast) {
        window.LFUI.toast('Se guardó en este dispositivo, pero no se pudo sincronizar con la nube. Revisa tu conexión.', { type: 'warning', title: 'Progreso sin sincronizar' })
        return new Promise(r => setTimeout(r, 1200))
      }
    })
  }

  function marcarUICompletada() {
    if (btn) {
      btn.disabled = true
      btn.textContent = '✓ Lección completada'
    }
    if (doneTag) doneTag.classList.remove('is-hidden')
  }

  function onCompletar() {
    marcarUICompletada()
    avisarSiFalloGuardado(completar(id).then(({ guardadoOk }) => guardadoOk).catch(() => false))
  }

  if (lec.quiz && !yaHecha) {
    if (btn) btn.disabled = true
    bindQuiz(id, () => {
      if (btn) {
        btn.disabled = false
        btn.textContent = 'Marcar como completada'
      }
    }, avisarSiFalloGuardado)
    if (btn) btn.addEventListener('click', onCompletar)
  } else if (lec.quiz && yaHecha) {
    bindQuiz(id, () => {})
  } else if (btn) {
    btn.addEventListener('click', onCompletar)
  }

  document.querySelectorAll('.lec-nav__btn, .lec-cta').forEach(a => {
    a.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      const destino = a.href
      pendiente.promise.then(() => { window.location.href = destino })
    })
  })

  if (!yaHecha) {
    sincronizar().then(lista => {
      if (lista.includes(id)) marcarUICompletada()
    }).catch(() => {})
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
