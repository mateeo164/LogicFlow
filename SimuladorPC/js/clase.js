import { exigirRol, cerrarSesion } from './auth.js'
import {
    obtenerClase, obtenerRoster, eliminarEstudianteDeClase,
    crearTarea, obtenerTareas, eliminarTarea, calcularCumplimiento
} from './clases.js'

const claseId = new URLSearchParams(location.search).get('id')

const AVATAR_COLORS = ['#0f76d8', '#7c3aed', '#059669', '#dc6c2a', '#db2777', '#0891b2']
const TIPO_META_LABEL = {
    web_nota_minima: 'Nota web ≥',
    web_aprobado: 'Aprobó ensamble web',
    ar_completo: 'Completó ensamble real (AR)'
}

let rosterActual = []
let categoriaActiva = 'deber'

function iniciales(nombre) {
    if (!nombre) return '?'
    const partes = nombre.trim().split(/\s+/)
    if (partes.length === 1) return partes[0][0].toUpperCase()
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function colorAvatar(nombre) {
    if (!nombre) return AVATAR_COLORS[0]
    let h = 0
    for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function setAvatar(el, nombre) {
    if (!el) return
    el.textContent = iniciales(nombre)
    el.style.background = colorAvatar(nombre)
    el.style.color = '#fff'
}

function formatFecha(iso) {
    if (!iso) return 'Sin fecha límite'
    return new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function renderRoster(roster) {
    const vacio = document.getElementById('roster-vacio')
    const tabla = document.getElementById('roster-table')
    const body = document.getElementById('roster-body')
    body.innerHTML = ''

    if (roster.length === 0) {
        vacio.hidden = false
        tabla.hidden = true
        document.getElementById('stat-matriculados').textContent = '0'
        document.getElementById('stat-pct-aprobado').textContent = '—'
        document.getElementById('stat-pct-ar').textContent = '—'
        return
    }
    vacio.hidden = true
    tabla.hidden = false

    const aprobados = roster.filter(r => r.progreso?.ensamble_web_aprobado === true).length
    const arCompletos = roster.filter(r => !!r.progreso?.ensamble_real_completado_at).length

    document.getElementById('stat-matriculados').textContent = String(roster.length)
    document.getElementById('stat-pct-aprobado').textContent = `${Math.round((aprobados / roster.length) * 100)}%`
    document.getElementById('stat-pct-ar').textContent = `${Math.round((arCompletos / roster.length) * 100)}%`

    roster.forEach(r => {
        const nombre = r.perfil?.full_name || r.perfil?.email?.split('@')[0] || 'Estudiante'
        const nota = r.progreso?.ensamble_web_nota
        const aprobado = r.progreso?.ensamble_web_aprobado === true
        const arInstalados = r.progreso?.ensamble_real_instalados?.length || 0
        const arCompleto = !!r.progreso?.ensamble_real_completado_at

        const tr = document.createElement('tr')
        tr.innerHTML = `
            <td class="roster-table__estudiante">
                <span class="avatar avatar--sm roster-avatar"></span>
                <span>${nombre}</span>
            </td>
            <td>${typeof nota === 'number' ? nota.toFixed(1) : '—'}</td>
            <td><span class="badge ${aprobado ? 'badge--success' : 'badge--muted'}">${aprobado ? 'Sí' : 'No'}</span></td>
            <td>${arCompleto ? '<span class="badge badge--success">Completo</span>' : `${arInstalados}/8 piezas`}</td>
            <td><button type="button" class="btn-icon-quitar" data-matricula="${r.matriculaId}" title="Quitar de la clase">✕</button></td>
        `
        setAvatar(tr.querySelector('.roster-avatar'), nombre)
        body.appendChild(tr)
    })

    body.querySelectorAll('.btn-icon-quitar').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('¿Quitar a este estudiante de la clase?')) return
            const ok = await eliminarEstudianteDeClase(btn.dataset.matricula)
            if (ok) await cargarTodo()
        })
    })
}

function renderTareaCard(tarea) {
    const cumplieron = rosterActual.filter(r => calcularCumplimiento(tarea, r.progreso)).length
    const total = rosterActual.length
    const metaTexto = tarea.tipo_meta === 'web_nota_minima'
        ? `${TIPO_META_LABEL[tarea.tipo_meta]} ${Number(tarea.meta_valor).toFixed(1)}`
        : TIPO_META_LABEL[tarea.tipo_meta]

    const div = document.createElement('div')
    div.className = 'tarea-card'
    div.innerHTML = `
        <div class="tarea-card__top">
            <h4>${tarea.titulo}</h4>
            <button type="button" class="btn-icon-quitar" data-tarea="${tarea.id}" title="Eliminar">✕</button>
        </div>
        ${tarea.descripcion ? `<p class="tarea-card__desc">${tarea.descripcion}</p>` : ''}
        <div class="tarea-card__meta">
            <span class="badge badge--muted">${metaTexto}</span>
            ${tarea.categoria === 'deber' && tarea.fecha_limite ? `<span class="badge badge--muted">📅 ${formatFecha(tarea.fecha_limite)}</span>` : ''}
            ${tarea.categoria === 'reto' && tarea.xp_bonus > 0 ? `<span class="badge badge--accent">+${tarea.xp_bonus} XP</span>` : ''}
        </div>
        <div class="tarea-card__cumplimiento">
            <div class="tarea-card__bar"><div style="width:${total ? Math.round((cumplieron / total) * 100) : 0}%"></div></div>
            <span>${cumplieron}/${total} estudiantes cumplieron</span>
        </div>
    `
    div.querySelector('.btn-icon-quitar').addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta tarea?')) return
        const ok = await eliminarTarea(tarea.id)
        if (ok) await cargarTareas()
    })
    return div
}

async function cargarTareas() {
    const tareas = await obtenerTareas(claseId, categoriaActiva)
    const lista = document.getElementById('tareas-list')
    const vacio = document.getElementById('tareas-vacio')
    lista.innerHTML = ''

    if (tareas.length === 0) {
        vacio.hidden = false
        return
    }
    vacio.hidden = true
    tareas.forEach(t => lista.appendChild(renderTareaCard(t)))
}

async function cargarTodo() {
    rosterActual = await obtenerRoster(claseId)
    renderRoster(rosterActual)
    await cargarTareas()
}

function abrirModalTarea() {
    document.getElementById('tarea-categoria').value = categoriaActiva
    actualizarCamposModal()
    document.getElementById('modal-crear-tarea').hidden = false
}

function cerrarModalTarea() {
    document.getElementById('modal-crear-tarea').hidden = true
    document.getElementById('form-crear-tarea').reset()
    document.getElementById('crear-tarea-mensaje').hidden = true
}

function actualizarCamposModal() {
    const categoria = document.getElementById('tarea-categoria').value
    const tipoMeta = document.getElementById('tarea-tipo-meta').value
    document.getElementById('grupo-meta-valor').hidden = tipoMeta !== 'web_nota_minima'
    document.getElementById('grupo-fecha-limite').hidden = categoria !== 'deber'
    document.getElementById('grupo-xp-bonus').hidden = categoria !== 'reto'
}

async function init() {
    if (!claseId) { window.location.href = 'docente.html'; return }

    const session = await exigirRol('Tutor')
    if (!session) return

    const clase = await obtenerClase(claseId)
    if (!clase || clase.docente_id !== session.user.id) {
        window.location.href = 'docente.html'
        return
    }

    const nombre = session.user?.user_metadata?.full_name || session.user?.email?.split('@')[0] || 'Docente'
    setAvatar(document.getElementById('header-avatar'), nombre)
    document.getElementById('header-nombre').textContent = nombre

    document.getElementById('clase-nombre').textContent = clase.nombre
    document.getElementById('clase-codigo').textContent = clase.codigo
    document.getElementById('clase-descripcion').textContent = clase.descripcion || ''

    await cargarTodo()

    document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => cerrarSesion())

    document.querySelectorAll('.tarea-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            document.querySelectorAll('.tarea-tab').forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            categoriaActiva = tab.dataset.categoria
            await cargarTareas()
        })
    })

    document.getElementById('btn-crear-tarea')?.addEventListener('click', abrirModalTarea)
    document.getElementById('modal-tarea-close')?.addEventListener('click', cerrarModalTarea)
    document.getElementById('modal-tarea-cancel')?.addEventListener('click', cerrarModalTarea)
    document.getElementById('modal-crear-tarea')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) cerrarModalTarea()
    })
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModalTarea()
    })
    document.getElementById('tarea-categoria')?.addEventListener('change', actualizarCamposModal)
    document.getElementById('tarea-tipo-meta')?.addEventListener('change', actualizarCamposModal)

    document.getElementById('form-crear-tarea')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const categoria = document.getElementById('tarea-categoria').value
        const titulo = document.getElementById('tarea-titulo').value.trim()
        const descripcion = document.getElementById('tarea-descripcion').value.trim()
        const tipoMeta = document.getElementById('tarea-tipo-meta').value
        const metaValor = document.getElementById('tarea-meta-valor').value
        const fechaLimite = document.getElementById('tarea-fecha-limite').value
        const xpBonus = document.getElementById('tarea-xp-bonus').value
        const msg = document.getElementById('crear-tarea-mensaje')
        const btn = document.getElementById('btn-guardar-tarea')

        if (!titulo) return
        if (tipoMeta === 'web_nota_minima' && !metaValor) {
            msg.hidden = false
            msg.className = 'auth-message auth-message--error'
            msg.textContent = 'Ingresa la nota mínima requerida.'
            return
        }

        btn.disabled = true
        btn.textContent = 'Creando...'
        const tarea = await crearTarea({ claseId, categoria, titulo, descripcion, tipoMeta, metaValor, xpBonus, fechaLimite })
        btn.disabled = false
        btn.textContent = 'Crear tarea'

        msg.hidden = false
        if (tarea) {
            msg.className = 'auth-message auth-message--success'
            msg.textContent = '✓ Tarea creada.'
            categoriaActiva = categoria
            document.querySelectorAll('.tarea-tab').forEach(t => t.classList.toggle('active', t.dataset.categoria === categoria))
            await cargarTareas()
            setTimeout(cerrarModalTarea, 1200)
        } else {
            msg.className = 'auth-message auth-message--error'
            msg.textContent = 'No se pudo crear la tarea. Intenta de nuevo.'
        }
    })
}

init()
