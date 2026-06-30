import { protegerRuta, cerrarSesion } from './auth.js'
import { obtenerProgreso, actualizarPerfil, obtenerEstadisticas } from './progreso.js'
import { getProgressSummary, formatXp } from './achievements.js'

const COMPONENTS = [
    { id: 'case',    label: 'Gabinete (Case)',              icon: '🗄' },
    { id: 'mb',      label: 'Placa base (Motherboard)',     icon: '🖥' },
    { id: 'cpu',     label: 'Procesador (CPU)',             icon: '⚡' },
    { id: 'cooler',  label: 'Disipador (Cooler)',           icon: '❄' },
    { id: 'ram',     label: 'Memoria RAM',                  icon: '📊' },
    { id: 'storage', label: 'Almacenamiento NVMe',          icon: '💾' },
    { id: 'gpu',     label: 'Tarjeta gráfica (GPU)',        icon: '🎮' },
    { id: 'power',   label: 'Fuente de poder (PSU)',        icon: '🔌' }
]

const COMP_LABEL = Object.fromEntries(COMPONENTS.map(c => [c.id, c.label]))

const AVATAR_COLORS = [
    '#0f76d8', '#7c3aed', '#059669', '#dc6c2a', '#db2777', '#0891b2'
]

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

function formatTiempo(segundos) {
    if (!segundos || segundos < 60) return `${segundos || 0} seg`
    if (segundos < 3600) return `${Math.round(segundos / 60)} min`
    const h = Math.floor(segundos / 3600)
    const m = Math.round((segundos % 3600) / 60)
    return m ? `${h}h ${m}m` : `${h}h`
}

function formatFecha(iso) {
    if (!iso) return 'Sin actividad aún'
    const d = new Date(iso)
    return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function renderPerfil(user) {
    const nombre = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Estudiante'
    const email = user?.email || ''
    const institucion = user?.user_metadata?.institucion || ''
    const rol = user?.user_metadata?.rol || 'Estudiante'

    setAvatar(document.getElementById('perfil-avatar'), nombre)
    setAvatar(document.getElementById('header-avatar'), nombre)
    setAvatar(document.getElementById('modal-avatar'), nombre)

    const setEl = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt }
    setEl('perfil-nombre', nombre)
    setEl('perfil-email', email)
    setEl('perfil-rol', rol)
    setEl('perfil-institucion', institucion)
    setEl('header-nombre', nombre)

    const rolTag = document.getElementById('perfil-rol')
    if (rolTag) {
        const rolLower = rol.toLowerCase()
        rolTag.className = `role-tag ${rolLower}`
    }

    const tutorPanel = document.getElementById('tutor-panel')
    if (tutorPanel) {
        tutorPanel.hidden = rol.toLowerCase() !== 'tutor'
    }

    document.getElementById('edit-nombre').value = nombre
    document.getElementById('edit-institucion').value = institucion
}

function renderProgreso(progreso) {
    const instalados = progreso?.componentes_instalados || []
    const total = COMPONENTS.length
    const completados = instalados.length
    const pct = Math.round((completados / total) * 100)
    const simulaciones = progreso?.simulaciones_completadas || 0
    const tiempoSeg = progreso?.tiempo_total_segundos || 0
    const ultimaAct = progreso?.updated_at || null

    const setEl = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt }

    setEl('stat-componentes', `${completados} / ${total}`)
    setEl('stat-simulaciones', simulaciones)
    setEl('stat-tiempo', formatTiempo(tiempoSeg))
    setEl('stat-porcentaje', `${pct}%`)
    setEl('pct-badge', `${pct}%`)
    setEl('ultima-actividad', formatFecha(ultimaAct))

    const fillEl = document.getElementById('progreso-fill')
    if (fillEl) fillEl.style.width = `${pct}%`

    const subtituloEl = document.getElementById('progreso-subtitulo')
    if (subtituloEl) {
        if (pct === 0) subtituloEl.textContent = 'Aún no has comenzado el laboratorio. ¡Arranca ahora!'
        else if (pct === 100) subtituloEl.textContent = '¡Simulación completa! Todos los componentes instalados.'
        else subtituloEl.textContent = `${completados} de ${total} componentes instalados.`
    }

    const listEl = document.getElementById('comp-check-list')
    if (!listEl) return

    listEl.innerHTML = COMPONENTS.map((comp, idx) => {
        const done = instalados.includes(comp.id)
        const current = !done && idx === completados
        const state = done ? 'done' : current ? 'current' : 'pending'
        const stateLabel = done ? 'Completado' : current ? 'Pendiente (siguiente)' : 'Pendiente'
        let iconHtml
        if (done) {
            iconHtml = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        } else if (current) {
            iconHtml = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        } else {
            iconHtml = `<span style="font-size:0.9rem">${comp.icon}</span>`
        }
        return `
        <li class="comp-check-item ${state}">
            <div class="comp-check-icon" aria-hidden="true">${iconHtml}</div>
            <span class="comp-check-label">${comp.label}</span>
            <span class="comp-check-state">${stateLabel}</span>
        </li>`
    }).join('')
}

function renderProgresoVacio() {
    renderProgreso(null)
}


function formatHora(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const EVENTO_META = {
    acierto:     { label: 'Ensamblaje correcto', cls: 'done',    icon: '✓' },
    error_pieza: { label: 'Pieza equivocada',    cls: 'pending', icon: '✕' },
    demora:      { label: 'Demora',              cls: 'current', icon: '⏱' }
}

function renderEstadisticas(stats) {
    const setEl = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt }

    const s = stats || { aciertos: 0, errores_pieza: 0, demoras: 0, precision: null, tiempo_promedio: 0, recientes: [] }

    setEl('stat-aciertos', s.aciertos || 0)
    setEl('stat-errores', s.errores_pieza || 0)
    setEl('stat-demoras', s.demoras || 0)
    setEl('stat-precision', s.precision == null ? '—' : `${s.precision}%`)
    setEl('stat-tiempo-prom', s.tiempo_promedio ? formatTiempo(s.tiempo_promedio) : '—')

    const listEl = document.getElementById('eventos-recientes')
    if (!listEl) return

    const recientes = s.recientes || []
    if (recientes.length === 0) {
        listEl.innerHTML = `
            <li class="comp-check-item pending">
                <div class="comp-check-icon" aria-hidden="true">•</div>
                <span class="comp-check-label">Aún no hay actividad registrada. ¡Entra al laboratorio 3D!</span>
            </li>`
        return
    }

    listEl.innerHTML = recientes.map(ev => {
        const meta = EVENTO_META[ev.tipo] || { label: ev.tipo, cls: 'pending', icon: '•' }
        const comp = COMP_LABEL[ev.componente] || ev.componente || ''
        let detalle = comp
        if (ev.tipo === 'error_pieza' && ev.componente_esperado) {
            detalle = `${comp} (se esperaba ${COMP_LABEL[ev.componente_esperado] || ev.componente_esperado})`
        } else if (ev.tipo === 'demora' && ev.segundos) {
            detalle = `${comp} · ${ev.segundos}s`
        }
        return `
        <li class="comp-check-item ${meta.cls}">
            <div class="comp-check-icon" aria-hidden="true">${meta.icon}</div>
            <span class="comp-check-label">${meta.label}${detalle ? ` — ${detalle}` : ''}</span>
            <span class="comp-check-state">${formatHora(ev.created_at)}</span>
        </li>`
    }).join('')
}


function renderAchievements(progreso, stats) {
    const summary = getProgressSummary(progreso, stats)

    const badgeEl = document.getElementById('level-badge')
    if (badgeEl) {
        badgeEl.textContent = `${summary.level.icon} ${summary.level.name}`
        badgeEl.style.background = `linear-gradient(135deg, ${summary.level.color}20, ${summary.level.color}10)`
        badgeEl.style.color = summary.level.color
        badgeEl.style.borderColor = `${summary.level.color}30`
    }

    const fillEl = document.getElementById('level-progress-fill')
    if (fillEl) {
        const pct = summary.xpInfo.target > 0
            ? Math.round((summary.xpInfo.current / summary.xpInfo.target) * 100)
            : 100
        fillEl.style.width = `${pct}%`
    }

    const currentXpEl = document.getElementById('level-current-xp')
    if (currentXpEl) currentXpEl.textContent = formatXp(summary.xp)

    const nextXpEl = document.getElementById('level-next-xp')
    if (nextXpEl) {
        nextXpEl.textContent = summary.xpInfo.remaining > 0
            ? `${summary.xpInfo.remaining} XP para ${summary.xpInfo.nextLevelName}`
            : 'Nivel máximo alcanzado'
    }

    const subtitulo = document.getElementById('badges-subtitulo')
    if (subtitulo) {
        subtitulo.textContent = `${summary.unlockedCount} de ${summary.totalBadges} insignias desbloqueadas`
    }

    const grid = document.getElementById('badges-grid')
    if (grid) {
        grid.innerHTML = summary.badges.map(b => `
            <div class="badge-card ${b.unlocked ? 'unlocked' : 'locked'}" title="${b.description}">
                <div class="badge-card__icon">${b.icon}</div>
                <span class="badge-card__title">${b.title}</span>
                <span class="badge-card__desc">${b.description}</span>
            </div>
        `).join('')
    }

    const recent = document.getElementById('recent-badges')
    if (recent) {
        if (summary.recentBadges.length > 0) {
            recent.innerHTML = summary.recentBadges.map(b => `
                <span class="recent-badge">${b.icon} ${b.title}</span>
            `).join('')
        } else {
            recent.innerHTML = '<span style="font-size:12px;color:var(--lf-text-muted)">Aún sin insignias. ¡Empieza a ensamblar!</span>'
        }
    }
}


function abrirModal() {
    const m = document.getElementById('modal-editar')
    if (!m) return
    m.removeAttribute('hidden')
    document.body.style.overflow = 'hidden'
    document.getElementById('edit-nombre')?.focus()
}

function cerrarModal() {
    const m = document.getElementById('modal-editar')
    if (!m) return
    m.setAttribute('hidden', '')
    document.body.style.overflow = ''
    limpiarMensajeModal()
}

function mostrarMensajeModal(msg, tipo = 'error') {
    const el = document.getElementById('modal-mensaje')
    if (!el) return
    el.textContent = msg
    el.className = `auth-message auth-message--${tipo}`
    el.removeAttribute('hidden')
}

function limpiarMensajeModal() {
    const el = document.getElementById('modal-mensaje')
    if (el) el.setAttribute('hidden', '')
}


async function init() {
    const session = await protegerRuta()
    if (!session) return

    const rawUser = localStorage.getItem('logicflow_user')
    const user = rawUser ? JSON.parse(rawUser) : null
    renderPerfil(user)

    const progreso = await obtenerProgreso()
    if (progreso) {
        renderProgreso(progreso)
    } else {
        renderProgresoVacio()
    }

    const estadisticas = await obtenerEstadisticas()
    renderEstadisticas(estadisticas)

    renderAchievements(progreso, estadisticas)

    document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => cerrarSesion())

    document.getElementById('btn-editar-perfil')?.addEventListener('click', abrirModal)
    document.getElementById('modal-close')?.addEventListener('click', cerrarModal)
    document.getElementById('modal-cancel')?.addEventListener('click', cerrarModal)

    document.getElementById('modal-editar')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) cerrarModal()
    })

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModal()
    })

    document.getElementById('edit-nombre')?.addEventListener('input', (e) => {
        setAvatar(document.getElementById('modal-avatar'), e.target.value)
    })

    document.getElementById('form-editar-perfil')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const btnGuardar = document.getElementById('btn-guardar-perfil')
        const nombre = document.getElementById('edit-nombre')?.value.trim()
        const institucion = document.getElementById('edit-institucion')?.value.trim()

        if (!nombre) {
            mostrarMensajeModal('El nombre no puede estar vacío.', 'error')
            return
        }

        if (btnGuardar) {
            btnGuardar.disabled = true
            btnGuardar.textContent = 'Guardando…'
        }
        limpiarMensajeModal()

        const result = await actualizarPerfil({ full_name: nombre, institucion })

        if (btnGuardar) {
            btnGuardar.disabled = false
            btnGuardar.textContent = 'Guardar cambios'
        }

        if (result.exito) {
            const rawUser = localStorage.getItem('logicflow_user')
            const updatedUser = rawUser ? JSON.parse(rawUser) : null
            renderPerfil(updatedUser)
            mostrarMensajeModal('Perfil actualizado correctamente.', 'success')
            setTimeout(cerrarModal, 1400)
        } else {
            mostrarMensajeModal(result.mensaje || 'No se pudo actualizar el perfil.', 'error')
        }
    })

}

init()
