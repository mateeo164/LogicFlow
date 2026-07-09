// notificaciones.js — Sistema de notificaciones del estudiante.
//
// Las notificaciones se DERIVAN del estado actual (tareas, insignias, progreso)
// más las notificaciones del servidor. Así, conseguir una insignia, completar
// una simulación o recibir una tarea genera un aviso automáticamente, sin
// depender de que un trigger de la base de datos haya corrido.
//
// El estado "leída" se guarda por id en localStorage, de modo que un aviso
// nuevo (id que no se había visto) aparece como no leído y suma al contador.
import { misTareas, misNotificaciones, marcarNotifsLeidas } from './tutor-api.js'
import { getProgressSummary } from './achievements.js'

const LEIDAS_KEY = 'logicflow_notifs_leidas'

// Menor número = mayor prioridad (solo para el color/estilo del aviso).
export const PRIORIDAD = { ALTA: 0, MEDIA: 1, BAJA: 2 }

// ---------------------------------------------------------------- estado leído
function leerLeidas() {
    try {
        const r = JSON.parse(localStorage.getItem(LEIDAS_KEY) || '[]')
        return new Set(Array.isArray(r) ? r : [])
    } catch (e) {
        return new Set()
    }
}

function guardarLeidas(set) {
    try {
        // Acotamos para no crecer sin límite.
        localStorage.setItem(LEIDAS_KEY, JSON.stringify([...set].slice(-300)))
    } catch (e) { /* almacenamiento no disponible */ }
}

// ------------------------------------------------------------------- utilidades
function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ))
}

function tiempoRelativo(ts) {
    if (!ts) return ''
    const seg = Math.floor((Date.now() - ts) / 1000)
    if (seg < 0) return ''
    if (seg < 60) return 'hace un momento'
    if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
    if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`
    if (seg < 604800) return `hace ${Math.floor(seg / 86400)} d`
    return new Date(ts).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })
}

function fmtFecha(iso) {
    if (!iso) return ''
    try {
        return new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })
    } catch (e) {
        return ''
    }
}

// ---------------------------------------------------------------- derivaciones
// `rank` define el ORDEN en la lista (0 = arriba). Las tareas pendientes son lo
// más importante, por eso van primero. `prioridad` solo controla el color.
function derivarDeTareas(tareas) {
    const ahora = Date.now()
    const out = []
    for (const t of (tareas || [])) {
        const venceTs = t.vence_at ? new Date(t.vence_at).getTime() : null
        const vencida = venceTs && venceTs < ahora
        const venceTxt = t.vence_at ? ` · vence ${fmtFecha(t.vence_at)}` : ' · sin fecha límite'

        if (t.calificada) {
            out.push({
                id: `tarea-calificada-${t.tarea_id}`, tipo: 'tarea_calificada',
                rank: 3, prioridad: PRIORIDAD.MEDIA, icono: '✅',
                titulo: `Tarea calificada: ${t.titulo}`,
                cuerpo: `${t.clase_nombre} · ${Number(t.nota).toFixed(1)}/${Number(t.puntaje_max).toFixed(0)}`,
                ts: ahora
            })
        } else if (t.entregada) {
            out.push({
                id: `tarea-entregada-${t.tarea_id}`, tipo: 'tarea_entregada',
                rank: 4, prioridad: PRIORIDAD.BAJA, icono: '📤',
                titulo: `Entrega enviada: ${t.titulo}`,
                cuerpo: `${t.clase_nombre} · esperando calificación`,
                ts: ahora
            })
        } else if (vencida) {
            out.push({
                id: `tarea-vencida-${t.tarea_id}`, tipo: 'tarea_vencida',
                rank: 1, prioridad: PRIORIDAD.ALTA, icono: '⚠️',
                titulo: `Tarea vencida: ${t.titulo}`,
                cuerpo: `${t.clase_nombre} · no entregada`,
                ts: venceTs
            })
        } else {
            out.push({
                id: `tarea-pendiente-${t.tarea_id}`, tipo: 'tarea_pendiente',
                rank: 0, prioridad: PRIORIDAD.ALTA, icono: '📝',
                titulo: `Tarea pendiente: ${t.titulo}`,
                cuerpo: `${t.clase_nombre}${venceTxt}`,
                ts: ahora, venceTs
            })
        }
    }
    return out
}

function derivarDeInsignias(summary) {
    return (summary?.badges || [])
        .filter(b => b.unlocked)
        .map(b => ({
            id: `insignia-${b.id}`, tipo: 'insignia',
            rank: 5, prioridad: PRIORIDAD.BAJA, icono: b.icon || '🏅',
            titulo: `Insignia desbloqueada: ${b.title}`,
            cuerpo: b.description || '',
            ts: null
        }))
}

function derivarDeServidor(notifs) {
    // Las de tarea ya se derivan de misTareas(); evitamos duplicar.
    return (notifs || [])
        .filter(n => !['tarea_nueva', 'tarea_calificada'].includes(n.tipo))
        .map(n => ({
            id: `srv-${n.id}`, tipo: n.tipo || 'aviso',
            rank: 2, prioridad: PRIORIDAD.MEDIA, icono: '🔔',
            titulo: n.titulo || 'Aviso',
            cuerpo: n.cuerpo || '',
            ts: n.created_at ? new Date(n.created_at).getTime() : null,
            _serverLeida: !!n.leida
        }))
}

function comparar(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank
    if (a.leida !== b.leida) return a.leida ? 1 : -1
    // Dentro de las pendientes, la fecha límite más próxima primero.
    if (a.rank === 0) return (a.venceTs || Infinity) - (b.venceTs || Infinity)
    return (b.ts || 0) - (a.ts || 0)
}

// Recolecta y ordena todas las notificaciones del estudiante.
export async function recolectar({ progreso, estadisticas, logros } = {}) {
    const [tareas, servidor] = await Promise.all([
        misTareas().catch(() => []),
        misNotificaciones().catch(() => [])
    ])

    const summary = getProgressSummary(progreso || {}, estadisticas || {}, logros || [])
    const leidas = leerLeidas()

    const items = [
        ...derivarDeTareas(tareas),
        ...derivarDeInsignias(summary),
        ...derivarDeServidor(servidor)
    ].map(n => ({ ...n, leida: leidas.has(n.id) || !!n._serverLeida }))

    items.sort(comparar)
    return items
}

// -------------------------------------------------------------------- campana UI
function initCampana({ recargar, intervalo = 60000 }) {
    const bell = document.getElementById('notif-bell')
    const badge = document.getElementById('notif-badge')
    if (!bell) return

    bell.hidden = false
    bell.setAttribute('aria-haspopup', 'true')
    bell.setAttribute('aria-expanded', 'false')

    const panel = document.createElement('div')
    panel.className = 'lf-notif-panel'
    panel.hidden = true
    panel.innerHTML = `
        <div class="lf-notif-head">
            <strong>Notificaciones</strong>
            <button type="button" class="lf-notif-marcar" hidden>Marcar todas leídas</button>
        </div>
        <ul class="lf-notif-items"></ul>`
    document.body.appendChild(panel)

    const itemsEl = panel.querySelector('.lf-notif-items')
    const marcarBtn = panel.querySelector('.lf-notif-marcar')
    let itemsCache = []

    function posicionar() {
        const r = bell.getBoundingClientRect()
        panel.style.top = `${Math.round(r.bottom + 10)}px`
        const gap = Math.max(12, Math.round(window.innerWidth - r.right))
        panel.style.right = `${gap}px`
    }

    function clasePrio(p) {
        return p === PRIORIDAD.ALTA ? 'prio-alta' : p === PRIORIDAD.MEDIA ? 'prio-media' : 'prio-baja'
    }

    function render(items) {
        itemsCache = items
        const noLeidas = items.filter(n => !n.leida)
        const hayAlta = noLeidas.some(n => n.prioridad === PRIORIDAD.ALTA)

        if (badge) {
            if (noLeidas.length) {
                badge.textContent = noLeidas.length > 9 ? '9+' : String(noLeidas.length)
                badge.hidden = false
                badge.classList.toggle('lf-notif-badge--alta', hayAlta)
            } else {
                badge.hidden = true
                badge.classList.remove('lf-notif-badge--alta')
            }
        }

        marcarBtn.hidden = noLeidas.length === 0

        if (!items.length) {
            itemsEl.innerHTML = `
                <li class="lf-notif-empty">
                    <span class="lf-notif-empty-ic">🔔</span>
                    <p>Estás al día</p>
                    <small>No tienes notificaciones por ahora.</small>
                </li>`
            return
        }

        itemsEl.innerHTML = items.map(n => `
            <li class="lf-notif-item ${n.leida ? '' : 'no-leida'} ${clasePrio(n.prioridad)}">
                <span class="lf-notif-ic">${n.icono || '🔔'}</span>
                <div class="lf-notif-txt">
                    <strong>${escapeHtml(n.titulo)}</strong>
                    ${n.cuerpo ? `<span class="lf-notif-cuerpo">${escapeHtml(n.cuerpo)}</span>` : ''}
                    ${n.ts ? `<span class="lf-notif-fecha">${tiempoRelativo(n.ts)}</span>` : ''}
                </div>
            </li>`).join('')
    }

    async function cargar() {
        let items = []
        try { items = await recargar() } catch (e) { items = [] }
        render(items)
    }

    function onOutside(e) {
        if (!panel.contains(e.target) && !bell.contains(e.target)) cerrar()
    }
    function onEsc(e) { if (e.key === 'Escape') cerrar() }

    function abrir() {
        posicionar()
        panel.hidden = false
        bell.setAttribute('aria-expanded', 'true')
        document.addEventListener('click', onOutside, true)
        document.addEventListener('keydown', onEsc)
        window.addEventListener('resize', posicionar)
        window.addEventListener('scroll', posicionar, true)
    }
    function cerrar() {
        panel.hidden = true
        bell.setAttribute('aria-expanded', 'false')
        document.removeEventListener('click', onOutside, true)
        document.removeEventListener('keydown', onEsc)
        window.removeEventListener('resize', posicionar)
        window.removeEventListener('scroll', posicionar, true)
    }

    bell.addEventListener('click', (e) => {
        e.stopPropagation()
        if (panel.hidden) abrir()
        else cerrar()
    })

    marcarBtn.addEventListener('click', async () => {
        const set = leerLeidas()
        itemsCache.forEach(n => set.add(n.id))
        guardarLeidas(set)
        try { await marcarNotifsLeidas() } catch (e) { /* sin conexión: al menos queda local */ }
        itemsCache = itemsCache.map(n => ({ ...n, leida: true }))
        render(itemsCache)
    })

    cargar()
    if (intervalo) setInterval(cargar, intervalo)
}

// Punto de entrada usado por el panel del estudiante (menu.js).
export function initNotificacionesEstudiante({ progreso, estadisticas, logros } = {}) {
    initCampana({ recargar: () => recolectar({ progreso, estadisticas, logros }) })
}
