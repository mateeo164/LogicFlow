
import {
    crearClase, misClasesTutor, resumenClase,
    unirseAClase, misClasesEstudiante,
    crearTarea, eliminarTarea, tareasDeClase, resumenTarea,
    calificarEntrega, entregarTarea, misTareas,
    renombrarClase, eliminarClase, quitarEstudiante,
    misNotificaciones, marcarNotifsLeidas
} from './tutor-api.js'

function formatTiempo(segundos) {
    if (!segundos || segundos < 60) return `${segundos || 0}s`
    if (segundos < 3600) return `${Math.round(segundos / 60)} min`
    const h = Math.floor(segundos / 3600)
    const m = Math.round((segundos % 3600) / 60)
    return m ? `${h}h ${m}m` : `${h}h`
}

function iniciales(nombre) {
    if (!nombre) return '?'
    const p = nombre.trim().split(/\s+/)
    return (p.length === 1 ? p[0][0] : p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function mostrarMsg(id, texto, tipo = 'error') {
    const el = document.getElementById(id)
    if (!el) return
    el.textContent = texto
    el.className = `tutor-msg tutor-msg--${tipo}`
    el.hidden = false
}

let claseSeleccionada = null
let claseActual = null  // { id, nombre, codigo, filas }

function toast(msg) {
    let el = document.getElementById('tutor-toast')
    if (!el) {
        el = document.createElement('div')
        el.id = 'tutor-toast'
        el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:9999;background:#11213a;color:#eaf2ff;padding:11px 18px;border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.4);font-size:14px;opacity:0;transition:opacity .25s'
        document.body.appendChild(el)
    }
    el.textContent = msg
    el.style.opacity = '1'
    clearTimeout(el._t)
    el._t = setTimeout(() => { el.style.opacity = '0' }, 2200)
}

export async function initTutorPanel() {
    const form = document.getElementById('form-crear-clase')
    form?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const input = document.getElementById('input-clase-nombre')
        const btn = document.getElementById('btn-crear-clase')
        const nombre = input?.value.trim()
        if (!nombre) return
        if (btn) { btn.disabled = true; btn.textContent = 'Creando…' }
        try {
            await crearClase(nombre)
            input.value = ''
            mostrarMsg('tutor-crear-msg', 'Clase creada. Comparte su código con tus estudiantes.', 'success')
            await cargarClasesTutor()
        } catch (err) {
            mostrarMsg('tutor-crear-msg', `No se pudo crear la clase: ${err.message}`, 'error')
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Crear clase' }
        }
    })

    document.querySelectorAll('#tutor-tabs .tutor-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.getAttribute('data-view')
            document.querySelectorAll('#tutor-tabs .tutor-tab').forEach(t => t.classList.toggle('is-active', t === tab))
            const est = document.getElementById('tutor-view-estudiantes')
            const tar = document.getElementById('tutor-view-tareas')
            if (est) est.hidden = view !== 'estudiantes'
            if (tar) tar.hidden = view !== 'tareas'
            if (view === 'tareas') cargarTareas()
        })
    })

    document.getElementById('form-crear-tarea')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        if (!claseSeleccionada) { mostrarMsg('tarea-crear-msg', 'Selecciona una clase primero.', 'error'); return }
        const titulo = document.getElementById('tarea-titulo')?.value.trim()
        const descripcion = document.getElementById('tarea-desc')?.value.trim()
        const puntajeMax = document.getElementById('tarea-puntaje')?.value || 10
        const venceRaw = document.getElementById('tarea-vence')?.value
        if (!titulo) return
        const btn = document.getElementById('btn-crear-tarea')
        if (btn) { btn.disabled = true; btn.textContent = 'Creando…' }
        try {
            await crearTarea({ claseId: claseSeleccionada, titulo, descripcion, puntajeMax, venceAt: venceRaw ? new Date(venceRaw).toISOString() : null })
            document.getElementById('tarea-titulo').value = ''
            document.getElementById('tarea-desc').value = ''
            document.getElementById('tarea-vence').value = ''
            mostrarMsg('tarea-crear-msg', 'Tarea creada.', 'success')
            await cargarTareas()
        } catch (err) {
            mostrarMsg('tarea-crear-msg', `No se pudo crear: ${err.message}`, 'error')
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Crear tarea' }
        }
    })

    // Acciones sobre la clase seleccionada.
    document.getElementById('btn-copiar-codigo')?.addEventListener('click', async () => {
        if (!claseActual?.codigo) return
        try { await navigator.clipboard.writeText(claseActual.codigo); toast(`Código ${claseActual.codigo} copiado`) }
        catch { toast(`Código: ${claseActual.codigo}`) }
    })

    document.getElementById('btn-exportar-csv')?.addEventListener('click', exportarCSV)

    document.getElementById('btn-renombrar-clase')?.addEventListener('click', async () => {
        if (!claseActual) return
        const nuevo = prompt('Nuevo nombre de la clase:', claseActual.nombre)
        if (!nuevo || !nuevo.trim() || nuevo.trim() === claseActual.nombre) return
        try {
            await renombrarClase(claseActual.id, nuevo.trim())
            claseActual.nombre = nuevo.trim()
            toast('Clase renombrada')
            await cargarClasesTutor()
            const titulo = document.getElementById('tutor-detalle-titulo')
            if (titulo) titulo.textContent = nuevo.trim()
        } catch (err) { toast('Error: ' + err.message) }
    })

    document.getElementById('btn-eliminar-clase')?.addEventListener('click', async () => {
        if (!claseActual) return
        if (!confirm(`¿Eliminar la clase "${claseActual.nombre}"? Se borrarán sus inscripciones y tareas. Esta acción no se puede deshacer.`)) return
        try {
            await eliminarClase(claseActual.id)
            toast('Clase eliminada')
            claseSeleccionada = null
            claseActual = null
            document.getElementById('tutor-detalle-titulo').textContent = 'Selecciona una clase'
            document.getElementById('tutor-detalle-codigo').hidden = true
            document.getElementById('tutor-detalle-actions').hidden = true
            document.getElementById('tutor-tabs').hidden = true
            document.getElementById('tutor-resumen').hidden = true
            document.getElementById('tutor-tabla-body').innerHTML = `<tr><td colspan="8" class="tutor-tabla-empty">Elige una clase de la izquierda.</td></tr>`
            await cargarClasesTutor()
        } catch (err) { toast('Error: ' + err.message) }
    })

    await cargarClasesTutor()
}

function exportarCSV() {
    if (!claseActual?.filas?.length) { toast('No hay estudiantes que exportar'); return }
    const cols = ['Estudiante', 'Email', 'Nota ensamble', 'Aprobo web', 'Completo app', 'Mejor reto', 'Retos superados', 'Logros', 'Tiempo (s)']
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const filas = claseActual.filas.map(f => [
        f.nombre, f.email, f.nota_web ?? '', f.web_aprobado ? 'Si' : 'No', f.movil_completado ? 'Si' : 'No',
        f.mejor_nota_reto ?? '', f.retos_superados, f.logros_total, f.tiempo_total_segundos
    ].map(esc).join(','))
    const csv = [cols.map(esc).join(','), ...filas].join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `calificaciones-${(claseActual.nombre || 'clase').toLowerCase().replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('CSV descargado')
}

function fmtFecha(iso) {
    if (!iso) return null
    try { return new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }) } catch { return null }
}

async function cargarTareas() {
    const list = document.getElementById('tutor-tareas-list')
    if (!list || !claseSeleccionada) return
    list.innerHTML = `<li class="tutor-clase-empty">Cargando tareas…</li>`
    let tareas = []
    try { tareas = await tareasDeClase(claseSeleccionada) } catch (err) {
        list.innerHTML = `<li class="tutor-clase-empty">Error: ${err.message}</li>`
        return
    }
    if (!tareas.length) {
        list.innerHTML = `<li class="tutor-clase-empty">Sin tareas aún. Crea una arriba.</li>`
        return
    }
    list.innerHTML = tareas.map(t => {
        const vence = fmtFecha(t.vence_at)
        return `
        <li class="tutor-tarea-item" data-id="${t.id}">
            <div class="tutor-tarea-head">
                <div>
                    <strong>${t.titulo}</strong>
                    <span class="tutor-tarea-meta">${t.puntaje_max} pts${vence ? ` · vence ${vence}` : ''}</span>
                </div>
                <button type="button" class="tutor-tarea-toggle">Ver entregas ▾</button>
            </div>
            ${t.descripcion ? `<p class="tutor-tarea-desc">${t.descripcion}</p>` : ''}
            <div class="tutor-tarea-entregas" hidden></div>
        </li>`
    }).join('')

    list.querySelectorAll('.tutor-tarea-item').forEach(li => {
        const toggle = li.querySelector('.tutor-tarea-toggle')
        const cont = li.querySelector('.tutor-tarea-entregas')
        toggle?.addEventListener('click', async () => {
            const abierto = !cont.hidden
            if (abierto) { cont.hidden = true; toggle.textContent = 'Ver entregas ▾'; return }
            cont.hidden = false
            toggle.textContent = 'Ocultar ▴'
            await cargarEntregas(li.getAttribute('data-id'), cont)
        })
    })
}

async function cargarEntregas(tareaId, cont) {
    cont.innerHTML = `<p class="tutor-clase-empty">Cargando…</p>`
    let filas = []
    try { filas = await resumenTarea(tareaId) } catch (err) {
        cont.innerHTML = `<p class="tutor-clase-empty">Error: ${err.message}</p>`
        return
    }
    if (!filas.length) {
        cont.innerHTML = `<p class="tutor-clase-empty">Sin estudiantes en la clase.</p>`
        return
    }
    cont.innerHTML = filas.map(f => `
        <div class="entrega-row" data-est="${f.estudiante_id}">
            <div class="entrega-alumno">
                <span class="entrega-estado ${f.entregada ? 'on' : ''}">${f.entregada ? '✓ Entregada' : 'Pendiente'}</span>
                <strong>${f.nombre}</strong>
            </div>
            <div class="entrega-calif">
                <input type="number" class="entrega-nota" min="0" step="0.1" placeholder="Nota" value="${f.nota != null ? f.nota : ''}">
                <input type="text" class="entrega-coment" placeholder="Comentario" value="${f.comentario ? f.comentario.replace(/"/g, '&quot;') : ''}">
                <button type="button" class="btn btn-secondary btn-sm entrega-guardar">Guardar</button>
            </div>
        </div>`).join('')

    cont.querySelectorAll('.entrega-row').forEach(row => {
        row.querySelector('.entrega-guardar')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget
            const estId = row.getAttribute('data-est')
            const nota = row.querySelector('.entrega-nota')?.value
            const comentario = row.querySelector('.entrega-coment')?.value
            btn.disabled = true; btn.textContent = '…'
            try {
                await calificarEntrega({ tareaId, estudianteId: estId, nota: nota === '' ? null : nota, comentario })
                btn.textContent = '✓'
                setTimeout(() => { btn.textContent = 'Guardar'; btn.disabled = false }, 1200)
            } catch (err) {
                btn.textContent = 'Error'; btn.disabled = false
            }
        })
    })
}

async function cargarClasesTutor() {
    const list = document.getElementById('tutor-clases-list')
    if (!list) return
    let clases = []
    try { clases = await misClasesTutor() } catch (err) {
        list.innerHTML = `<li class="tutor-clase-empty">No se pudieron cargar las clases: ${err.message}</li>`
        return
    }

    const setKpi = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v }
    setKpi('kpi-clases', clases.length)
    setKpi('kpi-estudiantes', clases.reduce((s, c) => s + (c.estudiantes || 0), 0))

    if (!clases.length) {
        list.innerHTML = `<li class="tutor-clase-empty">Aún no tienes clases. Crea una arriba para empezar.</li>`
        setKpi('kpi-promedio', '—')
        setKpi('kpi-certificados', '—')
        return
    }

    list.innerHTML = clases.map(c => `
        <li class="tutor-clase-item ${claseSeleccionada === c.id ? 'is-active' : ''}" data-id="${c.id}" data-nombre="${encodeURIComponent(c.nombre)}" data-codigo="${c.codigo}">
            <div class="tutor-clase-main">
                <strong>${c.nombre}</strong>
                <span>${c.estudiantes} estudiante${c.estudiantes === 1 ? '' : 's'}</span>
            </div>
            <span class="tutor-codigo-chip" title="Código para compartir">${c.codigo}</span>
        </li>`).join('')

    list.querySelectorAll('.tutor-clase-item').forEach(li => {
        li.addEventListener('click', () => {
            const id = li.getAttribute('data-id')
            seleccionarClase(id, decodeURIComponent(li.getAttribute('data-nombre')), li.getAttribute('data-codigo'))
            list.querySelectorAll('.tutor-clase-item').forEach(x => x.classList.remove('is-active'))
            li.classList.add('is-active')
        })
    })

    if (!claseSeleccionada && clases[0]) {
        const first = list.querySelector('.tutor-clase-item')
        first?.classList.add('is-active')
        seleccionarClase(clases[0].id, clases[0].nombre, clases[0].codigo)
    }
}

async function seleccionarClase(id, nombre, codigo) {
    claseSeleccionada = id
    claseActual = { id, nombre, codigo, filas: [] }
    const titulo = document.getElementById('tutor-detalle-titulo')
    const chip = document.getElementById('tutor-detalle-codigo')
    if (titulo) titulo.textContent = nombre
    if (chip) { chip.textContent = codigo; chip.hidden = false }
    const acciones = document.getElementById('tutor-detalle-actions')
    if (acciones) acciones.hidden = false

    const tabs = document.getElementById('tutor-tabs')
    if (tabs) tabs.hidden = false
    document.querySelectorAll('#tutor-tabs .tutor-tab').forEach(t => t.classList.toggle('is-active', t.getAttribute('data-view') === 'estudiantes'))
    const vEst = document.getElementById('tutor-view-estudiantes')
    const vTar = document.getElementById('tutor-view-tareas')
    if (vEst) vEst.hidden = false
    if (vTar) vTar.hidden = true
    const tareasList = document.getElementById('tutor-tareas-list')
    if (tareasList) tareasList.innerHTML = ''

    const resumen = document.getElementById('tutor-resumen')
    const body = document.getElementById('tutor-tabla-body')
    if (resumen) resumen.hidden = true
    if (body) body.innerHTML = `<tr><td colspan="8" class="tutor-tabla-empty">Cargando estudiantes…</td></tr>`

    let filas = []
    try { filas = await resumenClase(id) } catch (err) {
        if (body) body.innerHTML = `<tr><td colspan="8" class="tutor-tabla-empty">Error: ${err.message}</td></tr>`
        return
    }
    claseActual.filas = filas

    if (!filas.length) {
        if (body) body.innerHTML = `<tr><td colspan="8" class="tutor-tabla-empty">Sin estudiantes aún. Comparte el código <strong>${codigo}</strong> para que se unan.</td></tr>`
        setKpiClase(null)
        return
    }

    renderResumenClase(filas)

    if (body) body.innerHTML = filas.map(f => {
        const nota = f.nota_web != null ? Number(f.nota_web).toFixed(1) : '—'
        const notaCls = f.nota_web == null ? '' : (Number(f.nota_web) >= 7 ? 'ok' : 'bajo')
        const mejor = f.mejor_nota_reto != null ? Number(f.mejor_nota_reto).toFixed(1) : '—'
        const cert = `<span class="cert-mini ${f.web_aprobado ? 'on' : ''}">Web</span><span class="cert-mini ${f.movil_completado ? 'on' : ''}">App</span>`
        return `
        <tr data-est="${f.estudiante_id}" data-nombre="${encodeURIComponent(f.nombre)}">
            <td>
                <div class="tutor-alumno">
                    <span class="tutor-alumno__ava">${iniciales(f.nombre)}</span>
                    <div>
                        <strong>${f.nombre}</strong>
                        <span>${f.email || ''}</span>
                    </div>
                </div>
            </td>
            <td><span class="tutor-nota ${notaCls}">${nota}${f.nota_web != null ? '/10' : ''}</span></td>
            <td>${mejor}${f.mejor_nota_reto != null ? '/10' : ''}</td>
            <td>${f.retos_superados}</td>
            <td>${f.logros_total}</td>
            <td>${formatTiempo(f.tiempo_total_segundos)}</td>
            <td><div class="cert-mini-wrap">${cert}</div></td>
            <td><button type="button" class="tutor-quitar" title="Quitar de la clase">✕</button></td>
        </tr>`
    }).join('')

    body?.querySelectorAll('tr[data-est]').forEach(tr => {
        tr.querySelector('.tutor-quitar')?.addEventListener('click', async () => {
            const estId = tr.getAttribute('data-est')
            const nom = decodeURIComponent(tr.getAttribute('data-nombre'))
            if (!confirm(`¿Quitar a ${nom} de la clase?`)) return
            try {
                await quitarEstudiante(claseActual.id, estId)
                toast(`${nom} fue quitado de la clase`)
                await seleccionarClase(claseActual.id, claseActual.nombre, claseActual.codigo)
                await cargarClasesTutor()
            } catch (err) { toast('Error: ' + err.message) }
        })
    })
}

function renderResumenClase(filas) {
    const resumen = document.getElementById('tutor-resumen')
    if (!resumen) return
    const aprobados = filas.filter(f => f.web_aprobado).length
    const app = filas.filter(f => f.movil_completado).length
    const retos = filas.reduce((s, f) => s + (f.retos_superados || 0), 0)
    const tiempo = filas.reduce((s, f) => s + (f.tiempo_total_segundos || 0), 0)
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v }
    set('res-aprobados', `${aprobados}/${filas.length}`)
    set('res-app', `${app}/${filas.length}`)
    set('res-retos', retos)
    set('res-tiempo', formatTiempo(tiempo))
    resumen.hidden = false
    setKpiClase(filas)
}

function setKpiClase(filas) {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v }
    if (!filas || !filas.length) { set('kpi-promedio', '—'); set('kpi-certificados', '—'); return }
    const conNota = filas.filter(f => f.nota_web != null)
    const prom = conNota.length ? (conNota.reduce((s, f) => s + Number(f.nota_web), 0) / conNota.length) : null
    const completos = filas.filter(f => f.web_aprobado && f.movil_completado).length
    set('kpi-promedio', prom == null ? '—' : `${prom.toFixed(1)}/10`)
    set('kpi-certificados', `${completos}/${filas.length}`)
}

function fechaRelativa(iso) {
    if (!iso) return ''
    const d = new Date(iso), ahora = new Date()
    const seg = Math.round((ahora - d) / 1000)
    if (seg < 60) return 'ahora'
    if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
    if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`
    if (seg < 604800) return `hace ${Math.floor(seg / 86400)} d`
    return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })
}

const NOTIF_ICON = { tarea_nueva: '📝', tarea_calificada: '✅' }

export async function initNotificaciones() {
    const bell = document.getElementById('notif-bell')
    const card = document.getElementById('notificaciones-card')
    const badge = document.getElementById('notif-badge')
    const list = document.getElementById('notif-list')

    async function cargar() {
        let notis = []
        try { notis = await misNotificaciones() } catch { notis = [] }

        const noLeidas = notis.filter(n => !n.leida).length
        if (bell) bell.hidden = false
        if (badge) {
            if (noLeidas > 0) { badge.textContent = noLeidas > 9 ? '9+' : String(noLeidas); badge.hidden = false }
            else badge.hidden = true
        }

        if (!notis.length) {
            if (card) card.hidden = true
            return
        }
        if (card) card.hidden = false
        const sub = document.getElementById('notif-sub')
        if (sub) sub.textContent = noLeidas > 0 ? `${noLeidas} sin leer` : 'Estás al día.'

        if (list) list.innerHTML = notis.slice(0, 15).map(n => `
            <li class="notif-item ${n.leida ? '' : 'no-leida'}">
                <span class="notif-ic">${NOTIF_ICON[n.tipo] || '🔔'}</span>
                <div class="notif-body">
                    <strong>${n.titulo}</strong>
                    ${n.cuerpo ? `<span class="notif-cuerpo">${n.cuerpo}</span>` : ''}
                    <span class="notif-fecha">${fechaRelativa(n.created_at)}</span>
                </div>
            </li>`).join('')
    }

    bell?.addEventListener('click', () => {
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        card?.classList.add('destacar')
        setTimeout(() => card?.classList.remove('destacar'), 1400)
    })

    document.getElementById('btn-notif-leidas')?.addEventListener('click', async () => {
        try { await marcarNotifsLeidas(); await cargar() } catch (_) {}
    })

    await cargar()
    // Refresco ligero cada 60 s para avisos en vivo.
    setInterval(cargar, 60000)
}

export async function initClasesEstudiante() {
    const form = document.getElementById('form-unirse-clase')
    form?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const input = document.getElementById('input-codigo-clase')
        const btn = document.getElementById('btn-unirse-clase')
        const codigo = input?.value.trim()
        if (!codigo) return
        if (btn) { btn.disabled = true; btn.textContent = 'Uniéndote…' }
        try {
            const clase = await unirseAClase(codigo)
            input.value = ''
            mostrarMsg('unirse-msg', `Te uniste a "${clase?.nombre || 'la clase'}".`, 'success')
            await cargarMisClases()
        } catch (err) {
            mostrarMsg('unirse-msg', err.message || 'No se pudo unir a la clase.', 'error')
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Unirme' }
        }
    })

    await cargarMisClases()
    await cargarMisTareas()
}

async function cargarMisTareas() {
    const card = document.getElementById('mis-tareas-card')
    const list = document.getElementById('mis-tareas-list')
    if (!list) return
    let tareas = []
    try { tareas = await misTareas() } catch { tareas = [] }

    if (!tareas.length) {
        if (card) card.hidden = true
        return
    }
    if (card) card.hidden = false

    list.innerHTML = tareas.map(t => {
        const vence = fmtFecha(t.vence_at)
        let estado, cls
        if (t.calificada) { estado = `Calificada: ${Number(t.nota).toFixed(1)}/${Number(t.puntaje_max).toFixed(0)}`; cls = 'calificada' }
        else if (t.entregada) { estado = 'Entregada · por calificar'; cls = 'entregada' }
        else { estado = 'Pendiente'; cls = 'pendiente' }
        return `
        <li class="mi-tarea-item" data-id="${t.tarea_id}">
            <div class="mi-tarea-head">
                <div>
                    <strong>${t.titulo}</strong>
                    <span class="mi-tarea-clase">${t.clase_nombre}${vence ? ` · vence ${vence}` : ''}</span>
                </div>
                <span class="mi-tarea-estado ${cls}">${estado}</span>
            </div>
            ${t.descripcion ? `<p class="mi-tarea-desc">${t.descripcion}</p>` : ''}
            ${t.comentario ? `<p class="mi-tarea-coment">💬 ${t.comentario}</p>` : ''}
            ${!t.entregada ? `<button type="button" class="btn btn-primary btn-sm mi-tarea-entregar">Marcar como entregada</button>` : ''}
        </li>`
    }).join('')

    list.querySelectorAll('.mi-tarea-item').forEach(li => {
        li.querySelector('.mi-tarea-entregar')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget
            btn.disabled = true; btn.textContent = 'Enviando…'
            try {
                await entregarTarea(li.getAttribute('data-id'))
                await cargarMisTareas()
            } catch (err) {
                btn.textContent = 'Error'; btn.disabled = false
            }
        })
    })
}

async function cargarMisClases() {
    const list = document.getElementById('mis-clases-list')
    if (!list) return
    let clases = []
    try { clases = await misClasesEstudiante() } catch { clases = [] }

    if (!clases.length) {
        list.innerHTML = ''
        return
    }
    list.innerHTML = clases.map(c => `
        <li class="mis-clase-item">
            <span class="mis-clase-dot"></span>
            <strong>${c.nombre}</strong>
            <span class="tutor-codigo-chip tutor-codigo-chip--sm">${c.codigo}</span>
        </li>`).join('')
}
