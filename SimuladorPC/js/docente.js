import { exigirRol, cerrarSesion } from './auth.js'
import { obtenerMisClases, crearClase, obtenerRoster } from './clases.js'

const AVATAR_COLORS = ['#0f76d8', '#7c3aed', '#059669', '#dc6c2a', '#db2777', '#0891b2']

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

function renderPerfil(user) {
    const nombre = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Docente'
    const email = user?.email || ''
    const institucion = user?.user_metadata?.institucion || ''

    setAvatar(document.getElementById('perfil-avatar'), nombre)
    setAvatar(document.getElementById('header-avatar'), nombre)

    const setEl = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt }
    setEl('perfil-nombre', nombre)
    setEl('perfil-email', email)
    setEl('perfil-institucion', institucion)
    setEl('header-nombre', nombre)
}

function renderClaseCard(clase, roster) {
    const total = roster.length
    const aprobados = roster.filter(r => r.progreso?.ensamble_web_aprobado === true).length

    const card = document.createElement('a')
    card.href = `clase.html?id=${clase.id}`
    card.className = 'clase-card'
    card.innerHTML = `
        <div class="clase-card__top">
            <h3>${clase.nombre}</h3>
            <span class="clase-card__codigo">${clase.codigo}</span>
        </div>
        <p class="clase-card__desc">${clase.descripcion || 'Sin descripción'}</p>
        <div class="clase-card__stats">
            <span><strong>${total}</strong> estudiante${total === 1 ? '' : 's'}</span>
            <span><strong>${aprobados}</strong> aprobó${aprobados === 1 ? '' : 'aron'} web</span>
        </div>
    `
    return card
}

function abrirModalCrear() {
    document.getElementById('modal-crear-clase').hidden = false
}

function cerrarModalCrear() {
    document.getElementById('modal-crear-clase').hidden = true
    document.getElementById('form-crear-clase').reset()
    document.getElementById('crear-clase-mensaje').hidden = true
}

async function cargarClases() {
    const clases = await obtenerMisClases()
    const grid = document.getElementById('clases-grid')
    const vacio = document.getElementById('clases-vacio')
    grid.innerHTML = ''

    if (clases.length === 0) {
        vacio.hidden = false
        document.getElementById('stat-clases').textContent = '0'
        document.getElementById('stat-estudiantes').textContent = '0'
        document.getElementById('stat-aprobados').textContent = '0'
        return
    }
    vacio.hidden = true

    const rosters = await Promise.all(clases.map(c => obtenerRoster(c.id)))

    let totalEstudiantes = 0
    let totalAprobados = 0
    clases.forEach((clase, i) => {
        const roster = rosters[i]
        totalEstudiantes += roster.length
        totalAprobados += roster.filter(r => r.progreso?.ensamble_web_aprobado === true).length
        grid.appendChild(renderClaseCard(clase, roster))
    })

    document.getElementById('stat-clases').textContent = String(clases.length)
    document.getElementById('stat-estudiantes').textContent = String(totalEstudiantes)
    document.getElementById('stat-aprobados').textContent = String(totalAprobados)
}

async function init() {
    const session = await exigirRol('Tutor')
    if (!session) return

    renderPerfil(session.user)
    await cargarClases()

    document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => cerrarSesion())
    document.getElementById('btn-crear-clase')?.addEventListener('click', abrirModalCrear)
    document.getElementById('modal-crear-close')?.addEventListener('click', cerrarModalCrear)
    document.getElementById('modal-crear-cancel')?.addEventListener('click', cerrarModalCrear)
    document.getElementById('modal-crear-clase')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) cerrarModalCrear()
    })
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModalCrear()
    })

    document.getElementById('form-crear-clase')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const nombre = document.getElementById('clase-nombre').value.trim()
        const descripcion = document.getElementById('clase-descripcion').value.trim()
        const msg = document.getElementById('crear-clase-mensaje')
        const btn = document.getElementById('btn-guardar-clase')

        if (!nombre) return

        btn.disabled = true
        btn.textContent = 'Creando...'
        const clase = await crearClase({ nombre, descripcion })
        btn.disabled = false
        btn.textContent = 'Crear clase'

        msg.hidden = false
        if (clase) {
            msg.className = 'auth-message auth-message--success'
            msg.textContent = `✓ Clase creada. Código para compartir: ${clase.codigo}`
            await cargarClases()
            setTimeout(cerrarModalCrear, 1800)
        } else {
            msg.className = 'auth-message auth-message--error'
            msg.textContent = 'No se pudo crear la clase. Intenta de nuevo.'
        }
    })
}

init()
