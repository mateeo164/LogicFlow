import { GLOSARIO, filterGlosario } from './learning-tools.js'

function renderTerminos(terminos) {
  const grid = document.getElementById('glosario-grid')
  const empty = document.getElementById('glosario-empty')
  if (!grid) return

  if (terminos.length === 0) {
    grid.innerHTML = ''
    empty.hidden = false
    return
  }

  empty.hidden = true
  grid.innerHTML = terminos.map(item => `
    <article class="glosario-card">
      <div class="glosario-card__header">
        <h2>${item.term}</h2>
        <span class="glosario-card__title">${item.title}</span>
      </div>
      <p>${item.description}</p>
      <div class="glosario-card__tags">
        ${item.tags.map(t => `<span class="glosario-tag">${t}</span>`).join('')}
      </div>
    </article>
  `).join('')
}

function init() {
  const search = document.getElementById('glosario-search')

  // Si llega ?q= (p. ej. desde una lección de la Academia), pre-filtra el glosario.
  const q = new URLSearchParams(window.location.search).get('q')
  if (q && search) {
    search.value = q
    renderTerminos(filterGlosario(q))
  } else {
    renderTerminos(GLOSARIO)
  }

  if (search) {
    search.addEventListener('input', (e) => {
      renderTerminos(filterGlosario(e.target.value))
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
