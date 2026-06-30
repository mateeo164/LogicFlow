import { protegerRuta } from './auth.js'
import { obtenerProgreso, guardarProgreso, reiniciarProgreso, registrarEvento } from './progreso.js'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const PASOS = [
    {
        id: 'case', brand: 'NZXT', nombre: 'Gabinete',
        modelo: 'H510 Mid Tower', subtitulo: 'La estructura que protege y organiza',
        color: 0x60a5fa,
        ruta: 'assets/3d_models/computer_case_based_off_of_nzxt_510b/scene.gltf',
        size: 1.7, pos: new THREE.Vector3(0, 0.85, 0), rot: { x: 0, y: 0, z: 0 },
        specs: { 'Formato': 'Mid Tower ATX', 'Material': 'Acero + Vidrio templado', 'Bahías': '2.5" / 3.5"', 'Ventiladores': 'Hasta 7', 'Gestión de cables': 'Trasera' },
        hechos: [
            'El gabinete protege los componentes del polvo y los golpes',
            'Su diseño de flujo de aire mantiene fría toda la configuración',
            'Compatible con placas ATX, micro-ATX y mini-ITX',
            'Panel lateral de vidrio templado para mostrar el interior',
            'Gestión de cables trasera para un montaje limpio y ordenado'
        ],
        videoId: null,
        drone: {
            video:       'El gabinete es el esqueleto de tu PC: aloja y protege todos los componentes. Fíjate en sus bahías, soportes y zonas de ventilación.',
            instalacion: 'Coloca el gabinete en tu mesa de trabajo. Haz clic en el disco luminoso para posicionarlo y empezar el montaje.',
            exito:       '¡Listo! El gabinete está en su lugar. Ahora montaremos la placa base dentro de él.'
        }
    },
    {
        id: 'mb', brand: 'ASUS ROG', nombre: 'Placa Base',
        modelo: 'Strix X570-E Gaming', subtitulo: 'El núcleo que conecta todo',
        color: 0x22c55e,
        ruta: 'assets/3d_models/rog_strix_x370-f_motherboard/scene.gltf',
        size: 1.3, pos: new THREE.Vector3(-0.30, 1.03, -0.22), rot: { x: 0, y: 0, z: 0 },

        shelfRotX: -Math.PI / 18,
        shelfRotY: -Math.PI / 12,
        shelfScale: 1.12,
        shelfOffsetY: 0.018,
        specs: { 'Socket': 'AM4', 'Formato': 'ATX', 'Chipset': 'AMD X570', 'Memoria': '4× DDR4 (Máx 128 GB)', 'PCIe': 'PCIe 4.0 ×16' },
        hechos: [
            'La placa base conecta y comunica todos los componentes entre sí',
            'El socket AM4 es compatible con procesadores Ryzen 3000–5000',
            '4 ranuras DDR4 admiten hasta 128 GB de memoria RAM',
            'Incluye slots M.2 para almacenamiento NVMe ultrarrápido',
            'Distribuye la energía de la fuente a cada componente'
        ],
        videoId: null,
        drone: {
            video:       'La placa base es el componente central: todo se conecta a ella. Observa el socket del CPU, las ranuras de RAM y los slots PCIe.',
            instalacion: 'Selecciona la placa base en el cajón y haz clic en el disco luminoso dentro del gabinete para atornillarla a la bandeja.',
            exito:       '¡Excelente! La placa base está fijada. Es la columna vertebral de todo el sistema.'
        }
    },
    {
        id: 'cpu', brand: 'AMD', nombre: 'Procesador (CPU)',
        modelo: 'Ryzen 9 5900X', subtitulo: 'El cerebro del computador',
        color: 0x00e5ff,
        ruta: 'assets/3d_models/amd_ryzen/scene.gltf',
        size: 0.20, pos: new THREE.Vector3(-0.24, 1.26, -0.27), rot: { x: Math.PI / 2, y: 0, z: 0 },
        specs: { 'Núcleos/Hilos': '12C / 24T', 'Frecuencia Base': '3.7 GHz', 'Boost': '4.8 GHz', 'Caché L3': '64 MB', 'TDP': '105 W' },
        hechos: [
            'El procesador ejecuta las instrucciones de todos los programas',
            '12 núcleos físicos procesan hasta 24 hilos en simultáneo',
            'Frecuencia boost de 4.8 GHz para tareas exigentes',
            'El triángulo dorado indica la orientación correcta en el socket',
            'Es uno de los componentes más delicados: nunca toques sus pines'
        ],
        videoId: null,
        drone: {
            video:       'El procesador es el cerebro del PC. Atiende cómo alinear el triángulo dorado del chip con la marca del socket antes de instalarlo.',
            instalacion: 'Selecciona el CPU y colócalo en el socket AM4 de la placa. Respeta la orientación del triángulo dorado.',
            exito:       '¡Perfecto! El Ryzen 9 está asentado en el socket. Ahora debemos refrigerarlo.'
        }
    },
    {
        id: 'cooler', brand: 'AMD', nombre: 'Disipador (Cooler)',
        modelo: 'Wraith Stealth', subtitulo: 'Mantiene el CPU a temperatura segura',
        color: 0xf59e0b,
        ruta: 'assets/3d_models/amd_wraith_stealth_cpu_cooler/scene.gltf',
        size: 0.7, pos: new THREE.Vector3(-0.1, 1.28, -0.15), rot: { x: Math.PI / 2, y: 0, z: 0 },
        specs: { 'Tipo': 'Aire (torre baja)', 'Socket': 'AM4', 'Ventilador': '92 mm PWM', 'Disipación': 'Hasta 95 W TDP', 'Pasta térmica': 'Pre-aplicada' },
        hechos: [
            'El disipador extrae el calor que genera el procesador',
            'Sin refrigeración, el CPU se apagaría para protegerse en segundos',
            'La pasta térmica mejora la transferencia de calor al disipador',
            'El ventilador PWM ajusta su velocidad según la temperatura',
            'Se fija con clips o tornillos justo encima del procesador'
        ],
        videoId: null,
        drone: {
            video:       'El disipador evita que el procesador se sobrecaliente. La pasta térmica rellena los microporos para conducir mejor el calor.',
            instalacion: 'Selecciona el disipador y colócalo justo encima del procesador. El ventilador queda mirando hacia arriba.',
            exito:       '¡Muy bien! El CPU ya está refrigerado y protegido. Continuemos con la memoria.'
        }
    },
    {
        id: 'ram', brand: 'G.Skill', nombre: 'Memoria RAM',
        modelo: 'Trident Z Neo 32 GB', subtitulo: 'El espacio de trabajo del CPU',
        color: 0x7c4dff,
        ruta: 'assets/3d_models/ram_ddr4_g.skill_trident_z_neo/scene.gltf',
        size: 0.60, pos: new THREE.Vector3(0.0, 1.27, -0.20), rot: { x: 0, y: 1.8, z: 1.5708 },

        specs: { 'Capacidad': '32 GB (2×16 GB)', 'Tipo': 'DDR4', 'Velocidad': '3600 MHz', 'Latencia': 'CL16', 'Voltaje': '1.35 V' },
        hechos: [
            'La RAM es la memoria de trabajo temporal del procesador',
            'A más RAM, más programas abiertos sin perder fluidez',
            'Se instala en pares para activar el modo Dual Channel',
            'Dual Channel duplica el ancho de banda entre CPU y RAM',
            'Los módulos encajan con un clic en las ranuras de la placa'
        ],
        videoId: null,
        drone: {
            video:       'La RAM guarda los datos que el procesador usa en el momento. Se instala en pares y en las ranuras del mismo color para Dual Channel.',
            instalacion: 'Selecciona la RAM y colócala en las ranuras DDR4 de la placa. Presiona hasta escuchar el clic de los seguros.',
            exito:       '¡Bien hecho! 32 GB de DDR4 instalados. El sistema podrá ejecutar varias tareas pesadas a la vez.'
        }
    },
    {
        id: 'storage', brand: 'Samsung', nombre: 'Almacenamiento NVMe',
        modelo: '990 PRO 1 TB', subtitulo: 'Velocidad de transferencia extrema',
        color: 0x26a69a,
        ruta: 'assets/3d_models/m.2_nvme_ssd_samsung_990_pro_1tb_3d_model/scene.gltf',
        size: 0.3, pos: new THREE.Vector3(-0.05, 0.55, -0.28), rot: { x: 1.5708, y: 0, z: 0 },
        specs: { 'Capacidad': '1 TB', 'Factor Forma': 'M.2 2280', 'Interfaz': 'PCIe Gen 4.0 ×4', 'Lectura': '7450 MB/s', 'Escritura': '6900 MB/s' },
        hechos: [
            'El SSD NVMe almacena el sistema operativo y tus archivos',
            'Es hasta 47 veces más rápido que un disco duro mecánico',
            'Se conecta directo a la placa base, sin cables (slot M.2)',
            'Sin partes móviles: más silencioso y resistente que un HDD',
            'Con 7450 MB/s, el sistema arranca en pocos segundos'
        ],
        videoId: null,
        drone: {
            video:       'El SSD M.2 NVMe es el almacenamiento más rápido. Se inserta en ángulo en el slot M.2 y se asegura con un tornillo, ¡sin cables!',
            instalacion: 'Selecciona el SSD y colócalo en el slot M.2 de la placa base. Se inserta en ángulo y luego se baja para fijarlo.',
            exito:       '¡Increíble! Almacenamiento ultrarrápido instalado. Ahora la parte visual: la tarjeta gráfica.'
        }
    },
    {
        id: 'gpu', brand: 'NVIDIA', nombre: 'Tarjeta Gráfica (GPU)',
        modelo: 'GeForce RTX 3090', subtitulo: 'Motor de procesamiento visual',
        color: 0x10b981,
        ruta: 'assets/3d_models/nvidia_geforce_rtx_3090/scene.gltf',
        size: 1.0, pos: new THREE.Vector3(-0.36, 0.86, -0.06), rot: { x: -1.5708, y: 0, z: 0 },
        specs: { 'Arquitectura': 'Ampere', 'VRAM': '24 GB GDDR6X', 'CUDA Cores': '10496', 'Bus': '384-bit', 'Consumo': '350 W' },
        hechos: [
            'La GPU procesa todo lo que ves: escritorio, juegos y video',
            '10496 núcleos CUDA trabajan en paralelo para los gráficos',
            '24 GB de VRAM para texturas y modelos 3D de alta resolución',
            'Ray Tracing: simula la iluminación real en tiempo real',
            'Por su consumo, exige una fuente de poder potente y estable'
        ],
        videoId: null,
        drone: {
            video:       'La GPU es responsable de todos los gráficos. Se inserta en el slot PCIe ×16 y se alimenta con cables dedicados de la fuente.',
            instalacion: 'Selecciona la GPU y colócala en el slot PCIe ×16 principal. Escucharás el clic del seguro al encajar.',
            exito:       '¡Espectacular! La tarjeta gráfica está montada. Solo falta darle energía a todo el sistema.'
        }
    },
    {
        id: 'power', brand: 'EVGA', nombre: 'Fuente de Poder (PSU)',
        modelo: 'SuperNOVA 850 G6', subtitulo: 'El corazón eléctrico del sistema',
        color: 0xff5f7e,
        ruta: 'assets/3d_models/psu_power_supply_unit/scene.gltf',
        size: 0.8, pos: new THREE.Vector3(-0.48, 0.36, 0), rot: { x: 0, y: 1.5708, z: 0 },
        specs: { 'Potencia': '850 W', 'Certificación': '80 Plus Gold', 'Cableado': '100% Modular', 'Ventilador': '135 mm FDB', 'Protecciones': 'OCP / OVP / SCP' },
        hechos: [
            'La fuente convierte la corriente del enchufe en energía para el PC',
            '850 W alimentan con holgura una RTX 3090 y un Ryzen 9',
            'Certificación 80 Plus Gold: alta eficiencia, menos calor',
            'Cableado modular: solo conectas los cables que necesitas',
            'Sus protecciones evitan daños por picos o cortocircuitos'
        ],
        videoId: null,
        drone: {
            video:       'La fuente de poder suministra energía limpia y estable a todos los componentes. Va en el compartimento inferior del gabinete.',
            instalacion: 'Selecciona la fuente y colócala en el compartimento inferior del gabinete para conectar la energía a todo.',
            exito:       '¡ENSAMBLAJE COMPLETO! 🎉 Has construido una PC de alto rendimiento de principio a fin. ¡Excelente trabajo!'
        }
    }
]

const TOTAL = PASOS.length

function normalizarVideoId(videoValor) {
    if (!videoValor) return null

    const valor = String(videoValor).trim()
    if (!valor) return null

    if (/^[a-zA-Z0-9_-]{11}$/.test(valor)) {
        return valor
    }

    const match = valor.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
}

const UMBRAL_DEMORA_SEG = 45

let fase = 'bienvenida'
let indiceActual = 0
let selectedComponent = null
let sessionStartTime = Date.now()
let labStartTime = Date.now()
let erroresSesion = 0
let demorasSesion = 0

let scene, camera, renderer, controls, raycaster, mouse
let slotDiscs = []
let modelos3D = {}
const animacionesCaida = []
let motorListo = false

let walkControls = null
let walkMode = false
const teclas = { w: false, a: false, s: false, d: false, shift: false }
const relojWalk = new THREE.Clock()
const ALTURA_OJOS = 2.3
const RADIO_MESA = 1.45

let heldComponent = null
let heldMesh     = null
const shelfMeshes   = []
const shelfSlotObjs = {}
let frameCount = 0

let procActivo   = null
let camTween     = null
let iniciandoProc = false

// Fuerza un único recálculo de las sombras en el próximo render. Se usa cuando
// algo de la escena cambia (modelo colocado, animación de caída, etc.) ya que
// shadowMap.autoUpdate está desactivado por rendimiento.
function pedirActualizarSombras() {
    if (renderer) renderer.shadowMap.needsUpdate = true
}

// Objetos reutilizables para evitar asignaciones por frame en el bucle de render.
const _crosshairRay = new THREE.Raycaster()
const _scrFwd   = new THREE.Vector3()
const _scrRight = new THREE.Vector3()
const _scrLook  = new THREE.Vector3()
const _UP       = new THREE.Vector3(0, 1, 0)
const _CENTER   = new THREE.Vector2(0, 0)

const canvas = document.getElementById('game-canvas')

function montarDrone(contenedorId) {
    const c = document.getElementById(contenedorId)
    const tpl = document.getElementById('tpl-drone')
    if (!c || !tpl) return
    c.innerHTML = ''
    c.appendChild(tpl.content.cloneNode(true))
}

function setLoadingProgress(cargados, total) {
    const pct = total ? Math.round((cargados / total) * 100) : 0
    const fill = document.getElementById('loading-bar-fill')
    const cnt  = document.getElementById('loading-count')
    const txt  = document.getElementById('loading-text')
    if (fill) fill.style.width = `${pct}%`
    if (cnt)  cnt.textContent = `${cargados} / ${total} modelos`
    if (txt && cargados >= total && total > 0) txt.textContent = '¡Listo! Entrando al laboratorio…'
}

function mostrarLoading(texto) {
    const ov = document.getElementById('loading-overlay')
    if (!ov) return
    ov.style.display = 'flex'
    ov.classList.remove('is-hidden')
    const txt = document.getElementById('loading-text')
    if (txt && texto) txt.textContent = texto
}

function ocultarLoading() {
    const ov = document.getElementById('loading-overlay')
    if (!ov) return
    ov.classList.add('is-hidden')
    setTimeout(() => { ov.style.display = 'none' }, 500)
}

function mostrarOverlay(id) {
    for (const el of document.querySelectorAll('.lab-overlay')) {
        el.classList.remove('lab-overlay--active')
        el.hidden = true
    }
    document.getElementById('sim-main').hidden    = true
    document.getElementById('drone-float').hidden = true

    if (id === '3d') {
        document.getElementById('sim-main').hidden          = false
        document.getElementById('sim-header').style.display = ''
        document.getElementById('drone-float').hidden       = false
        setTimeout(resizeRenderer, 60)
    } else {
        document.getElementById('sim-header').style.display = 'none'
        const el = document.getElementById(id)
        if (el) { el.hidden = false; el.classList.add('lab-overlay--active') }

        if (walkControls?.isLocked) walkControls.unlock()
        const card = document.getElementById('walk-start')
        if (card) card.style.display = 'none'
    }
}

function mostrarBienvenida() {
    fase = 'bienvenida'
    mostrarOverlay('overlay-bienvenida')
    montarDrone('drone-bienvenida')
    const stepsEl = document.getElementById('bienvenida-steps')
    if (stepsEl) {
        stepsEl.innerHTML = PASOS.map((p, i) => `
            <span class="bv-step-pill ${i < indiceActual ? 'done' : i === indiceActual ? 'current' : ''}">
                ${i < indiceActual ? '✓' : i + 1} ${p.nombre}
            </span>`).join('')
    }
}

function mostrarVideo(idx) {
    indiceActual = idx
    fase = 'video'
    mostrarOverlay('overlay-video')
    montarDrone('drone-video')

    const paso = PASOS[idx]
    document.getElementById('vf-step-pill').textContent = `Componente ${idx + 1} / ${TOTAL}`
    document.getElementById('vf-titulo').textContent    = paso.nombre
    document.getElementById('vf-subtitulo').textContent = paso.subtitulo
    document.getElementById('bubble-video').textContent = paso.drone.video

    document.getElementById('vf-facts').innerHTML = paso.hechos.map(h =>
        `<li class="vf-fact-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f76d8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ${h}
        </li>`).join('')

    const player = document.getElementById('vf-player-area')
    const videoId = normalizarVideoId(paso.videoId)

    if (videoId) {
        player.innerHTML = `
            <iframe class="vf-iframe"
                src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen></iframe>`
    } else {
        player.innerHTML = `
            <div class="vf-info-card">
                <div class="vf-info-card__header">
                    <span class="vf-info-badge">Material educativo</span>
                    <h3>${paso.brand} ${paso.modelo}</h3>
                    <p>${paso.subtitulo}</p>
                </div>
                <div class="vf-specs-grid">
                    ${Object.entries(paso.specs).map(([k, v]) => `
                        <div class="vf-spec-item">
                            <span class="vf-spec-key">${k}</span>
                            <span class="vf-spec-val">${v}</span>
                        </div>`).join('')}
                </div>
                <div class="vf-video-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(15,118,216,0.4)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="rgba(15,118,216,0.4)"/></svg>
                    <p>El docente puede configurar un video de YouTube aquí</p>
                    <code class="vf-config-hint">PASOS[${idx}].videoId = 'https://youtu.be/z7cAyUsfwdA'</code>
                </div>
            </div>`
    }
}

function mostrarFase3D(idx) {
    indiceActual = idx
    fase = '3d'
    mostrarOverlay('3d')
    montarDrone('drone-float-svg')

    const paso = PASOS[idx]
    droneHabla(paso.drone.instalacion)
    activarMarcador(idx)
    renderChecklist()
    updateMissionProgress()
    renderDrawer()
    armarCaminar()
    setHint(`<strong>Instala: ${paso.nombre}</strong> — selecciona la pieza en el cajón y haz clic en el disco luminoso.`)
}

function droneHabla(msg) {
    const el = document.getElementById('drone-float-msg')
    if (el) el.textContent = msg
}

const NOTA_MINIMA = 7

function calcularNota() {
    let nota = 10 - erroresSesion * 1.0 - demorasSesion * 0.5
    return Math.max(0, Math.min(10, nota))
}

function obtenerNombreUsuario() {
    try {
        const u = JSON.parse(localStorage.getItem('logicflow_user') || 'null')
        return u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Estudiante'
    } catch { return 'Estudiante' }
}

function mostrarFinal() {
    fase = 'final'
    guardarStatsLocal()
    mostrarOverlay('overlay-final')
    montarDrone('drone-final')

    const t = Math.round((Date.now() - labStartTime) / 1000)
    const nota = calcularNota()
    const aprobado = nota >= NOTA_MINIMA

    const titEl = document.getElementById('final-title')
    const descEl = document.getElementById('final-desc')
    if (titEl) titEl.innerHTML = aprobado ? '¡PC ensamblada<br>con éxito!' : 'Ensamble<br>completado'
    if (descEl) {
        descEl.textContent = aprobado
            ? `¡Aprobado! Tu ensamble cumple el estándar (mínimo ${NOTA_MINIMA}/10). Ya puedes practicar la instalación real guiada en la app móvil.`
            : `Tu nota está por debajo del mínimo aceptable (${NOTA_MINIMA}/10). Repasa el orden y la elección de las piezas, y vuelve a intentarlo.`
    }

    const el = document.getElementById('final-stats')
    if (el) {
        el.innerHTML = `
            <div class="final-stat"><strong>${TOTAL}</strong><span>Componentes<br>instalados</span></div>
            <div class="final-stat"><strong>${formatTiempo(t)}</strong><span>Tiempo de<br>ensamblaje</span></div>
            <div class="final-stat"><strong>${erroresSesion}</strong><span>Errores<br>de pieza</span></div>
            <div class="final-stat"><strong style="color:${aprobado ? '#22c55e' : '#ef4444'}">${nota.toFixed(1)}/10</strong><span>Nota<br>${aprobado ? 'APROBADO' : 'NO APROBADO'}</span></div>`
    }

    const acc = document.getElementById('final-actions')
    if (acc) {
        let html = ''
        html += `<button type="button" class="btn btn-explore" id="btn-explorar-taller">Explorar el taller →</button>`
        if (aprobado) {
            html += `<button type="button" class="btn btn-primary" id="btn-app-movil">Continuar a la app móvil →</button>`
        } else {
            html += `<button type="button" class="btn btn-primary" id="btn-reintentar">↻ Volver a intentarlo</button>`
        }
        html += `<button type="button" class="btn btn-secondary" id="btn-descargar-img">⬇ Descargar imagen del ensamble</button>`
        if (aprobado) {
            html += `<button type="button" class="btn btn-secondary" id="btn-reintentar">↻ Volver a intentarlo</button>`
        }
        acc.innerHTML = html
        document.getElementById('btn-explorar-taller')?.addEventListener('click', explorarTaller)
        document.getElementById('btn-descargar-img')?.addEventListener('click', () => descargarImagenEnsamble(nota, aprobado))
        document.getElementById('btn-reintentar')?.addEventListener('click', volverAIntentar)
        document.getElementById('btn-app-movil')?.addEventListener('click', irAppMovil)
    }

    const aviso = document.getElementById('final-aviso')
    if (aviso) aviso.style.display = 'none'
}

async function volverAIntentar() {
    limpiarProgresoLocal()
    try { await reiniciarProgreso() } catch (_) {  }
    location.reload()
}

function irAppMovil() {
    const aviso = document.getElementById('final-aviso')
    if (aviso) {
        aviso.style.display = 'block'
        aviso.innerHTML = '📱 <strong>App móvil en construcción.</strong> Pronto podrás escanear con la cámara para una instalación real guiada paso a paso. ¡Tu aprobación quedará registrada!'
    }
}

function explorarTaller() {
    fase = '3d'
    mostrarOverlay('3d')
    actualizarOverlayWalk()
    droneHabla('¡Tu PC está lista! Camina por el taller y observa el sistema que construiste. Usa W/A/S/D para moverte.')
}

function descargarImagenEnsamble(nota, aprobado) {
    if (!renderer || !scene || !camera) return

    camera.position.set(1.7, 1.42, 2.65)
    camera.lookAt(0, 0.9, 0)
    renderer.render(scene, camera)

    const snap = renderer.domElement
    const sw = snap.width, sh = snap.height
    const padTop = Math.round(sw * 0.085)
    const padBottom = Math.round(sw * 0.13)

    const out = document.createElement('canvas')
    out.width = sw
    out.height = sh + padTop + padBottom
    const ctx = out.getContext('2d')

    ctx.fillStyle = '#0e1726'
    ctx.fillRect(0, 0, out.width, out.height)

    ctx.fillStyle = '#11213a'
    ctx.fillRect(0, 0, out.width, padTop)
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#3a8bff'
    ctx.font = `bold ${Math.round(sw * 0.036)}px 'Segoe UI', Arial, sans-serif`
    ctx.fillText('Logic', 26, padTop / 2)
    const wLogic = ctx.measureText('Logic').width
    ctx.fillStyle = '#eaf2ff'
    ctx.fillText('Flow', 26 + wLogic, padTop / 2)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#9fb3c8'
    ctx.font = `${Math.round(sw * 0.022)}px 'Segoe UI', Arial, sans-serif`
    ctx.fillText('Simulador de ensamble de PC', out.width - 26, padTop / 2)

    ctx.drawImage(snap, 0, padTop, sw, sh)

    const fy = padTop + sh
    ctx.fillStyle = '#11213a'
    ctx.fillRect(0, fy, out.width, padBottom)

    const nombre = obtenerNombreUsuario()
    const fecha = new Date().toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' })

    ctx.textAlign = 'left'
    ctx.fillStyle = '#eaf2ff'
    ctx.font = `bold ${Math.round(sw * 0.030)}px 'Segoe UI', Arial, sans-serif`
    ctx.fillText(nombre, 26, fy + padBottom * 0.34)
    ctx.fillStyle = '#9fb3c8'
    ctx.font = `${Math.round(sw * 0.022)}px 'Segoe UI', Arial, sans-serif`
    ctx.fillText(fecha, 26, fy + padBottom * 0.70)

    ctx.textAlign = 'right'
    ctx.fillStyle = aprobado ? '#34d399' : '#f87171'
    ctx.font = `bold ${Math.round(sw * 0.042)}px 'Segoe UI', Arial, sans-serif`
    ctx.fillText(`Nota: ${nota.toFixed(1)}/10`, out.width - 26, fy + padBottom * 0.36)
    ctx.fillStyle = '#9fb3c8'
    ctx.font = `${Math.round(sw * 0.020)}px 'Segoe UI', Arial, sans-serif`
    ctx.fillText(aprobado ? 'APROBADO' : 'NO APROBADO', out.width - 26, fy + padBottom * 0.72)

    try {
        const a = document.createElement('a')
        const slug = nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        a.download = `ensamble-logicflow-${slug || 'estudiante'}.png`
        a.href = out.toDataURL('image/png')
        a.click()
        appendLog('Imagen del ensamble descargada.', 'success')
    } catch (err) {
        appendLog('No se pudo generar la imagen: ' + err.message, 'warn')
    }
}

function formatTiempo(seg) {
    if (seg < 60) return `${seg}s`
    return `${Math.floor(seg / 60)}m ${seg % 60}s`
}

const btnToggle = document.getElementById('btn-toggle-components')
const drawer    = document.getElementById('components-drawer')
const btnClose  = document.getElementById('btn-close-drawer')

btnToggle?.addEventListener('click', () => drawer.classList.toggle('hidden'))
btnClose?.addEventListener('click',  () => drawer.classList.add('hidden'))

function renderDrawer() {
    const list = document.getElementById('component-list')
    if (!list) return
    list.innerHTML = PASOS.map((comp, i) => {
        const instalado = i < indiceActual
        const bloqueado = i > indiceActual
        const selected  = selectedComponent && selectedComponent.id === comp.id
        const style = selected ? `border-color:#${comp.color.toString(16).padStart(6,'0')};background:#13213c;` : ''
        return `
            <button class="component-chip ${instalado ? 'is-installed' : ''}"
                    data-component="${comp.id}" style="${style}"
                    ${bloqueado || instalado ? 'disabled' : ''}>
                <span class="comp-brand">${comp.brand}</span>
                <span class="comp-model">${instalado ? '✓ ' : ''}${comp.nombre}</span>
            </button>`
    }).join('')
}

function renderChecklist() {
    const ul = document.getElementById('checklist-ul')
    if (!ul) return
    ul.innerHTML = PASOS.map((p, i) => {
        const state = i < indiceActual ? 'done' : i === indiceActual ? 'current' : 'pending'
        const clickable = i < indiceActual
        return `<li class="hw-item hw-item--${state}" data-idx="${i}"
                    style="${clickable ? 'cursor:pointer;opacity:1;' : ''}">
                    <span class="hw-dot"></span><span>${p.nombre}</span>
                    ${clickable ? '<span style="font-size:0.65rem;opacity:0.6;margin-left:4px;">↩</span>' : ''}
                </li>`
    }).join('')
}

function retrocederA(idx) {
    PASOS.forEach((p, i) => {
        if (i > idx) {
            const m = modelos3D[p.id]
            if (m) m.visible = false
        }
    })
    indiceActual = idx + 1
    localStorage.setItem(LS_KEY, JSON.stringify(PASOS.slice(0, idx + 1).map(p => p.id)))
    selectedComponent = null
    renderChecklist()
    updateMissionProgress()
    renderDrawer()
    mostrarFase3D(indiceActual)
    appendLog(`Regresaste al paso ${idx + 2}: ${PASOS[indiceActual]?.nombre || ''}`, 'info')
}

function updateMissionProgress() {
    const pct = Math.round((indiceActual / TOTAL) * 100)
    const fill = document.getElementById('progress-fill')
    const lbl  = document.getElementById('progress-label')
    if (fill) fill.style.width = `${pct}%`
    if (lbl)  lbl.textContent = `${indiceActual} / ${TOTAL}`

    const title = document.getElementById('mission-title')
    if (indiceActual < TOTAL) {
        const p = PASOS[indiceActual]
        if (title) title.textContent = `Paso ${indiceActual + 1}: Instalar ${p.nombre}`
        const instr = document.getElementById('instruction-p')
        if (instr) instr.textContent = p.drone.instalacion
    } else {
        if (title) title.textContent = '¡POST exitoso! Gabinete listo.'
        if (btnToggle) btnToggle.style.display = 'none'
    }
}

function appendLog(msg, type = 'system') {
    const log = document.getElementById('terminal-log')
    if (!log) return
    const line = document.createElement('div')
    line.className = `log-line ${type}`
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`
    log.appendChild(line)
    log.scrollTop = log.scrollHeight
}

function setHint(msg) {
    const el = document.getElementById('hint-box')
    if (el) el.innerHTML = msg
}

function handleSelection(componentId) {
    const idx  = PASOS.findIndex(p => p.id === componentId)
    if (idx !== indiceActual) return
    const paso = PASOS[idx]

    selectedComponent = paso
    renderDrawer()
    drawer?.classList.add('hidden')
    actualizarOverlayWalk()
    appendLog(`Seleccionado: ${paso.brand} ${paso.nombre}`, 'info')
    setHint(`<strong>En mano: ${paso.nombre}</strong> — haz clic en el disco luminoso del chasis para anclarlo.`)
    droneHabla(`¡Bien! Ahora haz clic en el disco luminoso para colocar "${paso.nombre}".`)

    const specs = document.getElementById('specs-content')
    if (specs) {
        let html = `<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">`
        for (const [k, v] of Object.entries(paso.specs)) {
            html += `<tr style="border-bottom:1px solid var(--border-light)">
                <td style="padding:7px 0;font-weight:600;color:var(--blue-600)">${k}</td>
                <td style="text-align:right;color:var(--text-700)">${v}</td></tr>`
        }
        specs.innerHTML = html + `</table>`
    }

    activarMarcador(idx, true)
}

function onCanvasClick(e) {
    if (procActivo) { clicProcedimiento(e); return }
    if (walkMode) return
    if (!selectedComponent) {
        droneHabla('Primero selecciona el componente en el cajón inferior.')
        return
    }
    const rect = canvas.getBoundingClientRect()
    mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
    mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)

    const hits = raycaster.intersectObjects(slotDiscs)
    const hit = hits.find(h => h.object.userData.id === selectedComponent.id)
    if (hit) {
        if (tieneProcedimiento(selectedComponent.id)) iniciarProcedimiento(selectedComponent)
        else finalizarPaso(selectedComponent)
    } else {
        droneHabla(`Haz clic sobre el disco luminoso de "${selectedComponent.nombre}".`)
    }
}

function entrarCaminar() {
    if (!walkControls || walkMode || fase !== '3d') return
    walkControls.lock()
}

function onWalkLock() {
    walkMode = true
    const card = document.getElementById('walk-start')
    if (card) card.style.display = 'none'
    const ch = document.getElementById('crosshair')
    if (ch) ch.style.display = 'block'
    appendLog('Caminando. E = agarrar/instalar · Q = soltar · Esc = menús.', 'info')
}

function onWalkUnlock() {
    walkMode = false
    for (const k in teclas) teclas[k] = false
    const ch = document.getElementById('crosshair')
    if (ch) ch.style.display = 'none'

    if (iniciandoProc) { iniciandoProc = false; return }

    if (heldComponent) soltarComponente()
    actualizarOverlayWalk()
}

function armarCaminar() {
    if (controls) controls.enabled = false
    const eyeY = SALA.y0 + ALTURA_OJOS
    camera.position.set(0, eyeY, 3.2)
    camera.lookAt(0, eyeY, 0)
    actualizarOverlayWalk()
}

function actualizarOverlayWalk() {
    const card = document.getElementById('walk-start')
    if (!card) return
    const mostrar = fase === '3d' && !walkMode && !selectedComponent && !heldComponent
    card.style.display = mostrar ? 'flex' : 'none'
}

function actualizarCaminar(delta) {
    if (!walkMode || !walkControls.isLocked) return
    const vel = (teclas.shift ? 4.2 : 2.2) * delta
    const obj = walkControls.getObject()
    const ax = obj.position.x, az = obj.position.z

    if (teclas.w) walkControls.moveForward(vel)
    if (teclas.s) walkControls.moveForward(-vel)
    if (teclas.d) walkControls.moveRight(vel)
    if (teclas.a) walkControls.moveRight(-vel)

    colisionarSala(obj.position, ax, az)
    obj.position.y = SALA.y0 + ALTURA_OJOS
}

function colisionarSala(pos, prevX, prevZ) {
    const m = 0.4
    pos.x = Math.min(SALA.xMax - m, Math.max(SALA.xMin + m, pos.x))
    pos.z = Math.min(SALA.zMax - m, Math.max(SALA.zMin + m, pos.z))

    if (Math.hypot(pos.x, pos.z) < RADIO_MESA) {
        pos.x = prevX
        pos.z = prevZ
    }
}

async function finalizarPaso(paso) {
    ocultarMarcador(paso.id)
    colocarModelo(paso, true)

    appendLog(`${paso.nombre} instalado correctamente.`, 'success')
    droneHabla(paso.drone.exito)
    setHint(`✓ ${paso.nombre} instalado. ${paso.drone.exito}`)

    const specs = document.getElementById('specs-content')
    if (specs) specs.innerHTML = `<p class="empty-spec-text">Pieza instalada con éxito.</p>`

    const segundos = Math.round((Date.now() - sessionStartTime) / 1000)
    sessionStartTime = Date.now()

    registrarEvento({ tipo: 'acierto', componenteId: paso.id, segundos })
    if (segundos > UMBRAL_DEMORA_SEG) {
        demorasSesion++
        registrarEvento({ tipo: 'demora', componenteId: paso.id, segundos })
        appendLog(`Tardaste ${segundos}s en "${paso.nombre}" (más de ${UMBRAL_DEMORA_SEG}s).`, 'warn')
    }

    guardarProgresoLocal(paso.id)
    const guardado = await guardarProgreso({ componenteId: paso.id, segundos, total: TOTAL })
    if (guardado) appendLog('Progreso guardado en la base de datos.', 'info')

    selectedComponent = null
    if (heldComponent?.id === paso.id) soltarComponenteInstalado(paso.id)
    indiceActual++
    renderChecklist()
    updateMissionProgress()

    setTimeout(() => {
        if (indiceActual < TOTAL) mostrarVideo(indiceActual)
        else mostrarFinal()
    }, 2400)
}

function initMotor3D() {
    raycaster = new THREE.Raycaster()
    mouse     = new THREE.Vector2()
    scene     = new THREE.Scene()

    scene.background = new THREE.Color(0x6f6a63)

    const w = canvas.clientWidth || canvas.parentElement.clientWidth
    const h = canvas.clientHeight || canvas.parentElement.clientHeight
    camera = new THREE.PerspectiveCamera(46, w / h, 0.05, 100)
    camera.position.set(1.45, 1.30, 2.85)

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(w, h, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    // La escena es prácticamente estática: las sombras se recalculan solo
    // cuando algo cambia (modelo colocado, animación, modo caminar), no en cada frame.
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance   = 0.7
    controls.maxDistance   = 4.5
    controls.maxPolarAngle = Math.PI / 2 - 0.04
    controls.target.set(0, 0.78, 0)

    canvas.addEventListener('click', onCanvasClick)

    walkControls = new PointerLockControls(camera, renderer.domElement)
    walkControls.addEventListener('lock', onWalkLock)
    walkControls.addEventListener('unlock', onWalkUnlock)

    construirEntorno()
    construirIluminacion()
    crearMarcadores()
    precargarModelos()
    animar()

    window.__lab = {
        get scene() { return scene },
        get camera() { return camera },
        get controls() { return controls },
        modelos3D, PASOS, THREE,
        medir() {
            const r = n => Math.round(n * 1000) / 1000
            const o = {}
            for (const p of PASOS) {
                const g = modelos3D[p.id]
                if (!g) { o[p.id] = null; continue }
                const box = new THREE.Box3().setFromObject(g)
                const s = box.getSize(new THREE.Vector3())
                o[p.id] = {
                    size: [r(s.x), r(s.y), r(s.z)],
                    min:  [r(box.min.x), r(box.min.y), r(box.min.z)],
                    max:  [r(box.max.x), r(box.max.y), r(box.max.z)],
                    pos:  [r(g.position.x), r(g.position.y), r(g.position.z)]
                }
            }
            o._camera = { pos: [r(camera.position.x), r(camera.position.y), r(camera.position.z)], target: [r(controls.target.x), r(controls.target.y), r(controls.target.z)] }
            return o
        },

        proc(id) {
            const paso = PASOS.find(p => p.id === id)
            if (!paso) return `no existe el id "${id}"`
            if (!tieneProcedimiento(id)) return `"${id}" no tiene procedimiento guiado`
            iniciarProcedimiento(paso)
            return `procedimiento de "${paso.nombre}" iniciado`
        },

        show(id) {
            const paso = PASOS.find(p => p.id === id)
            if (!paso) return `no existe el id "${id}"`
            if (!modelos3D[id]) return `el modelo de "${id}" aún no ha cargado`
            colocarModelo(paso, false)
            activarMarcador(PASOS.indexOf(paso))
            return `mostrando "${paso.nombre}"`
        },

        set(id, o = {}) {
            const paso = PASOS.find(p => p.id === id)
            if (!paso) return `no existe el id "${id}"`
            const g = modelos3D[id]
            const D = Math.PI / 180

            if (o.x != null) paso.pos.x = o.x
            if (o.y != null) paso.pos.y = o.y
            if (o.z != null) paso.pos.z = o.z

            if (!paso.rot) paso.rot = { x: 0, y: 0, z: 0 }
            if (o.rx != null) paso.rot.x = o.rx * D
            if (o.ry != null) paso.rot.y = o.ry * D
            if (o.rz != null) paso.rot.z = o.rz * D

            if (o.size != null && g && g.children[0]) {
                const inner = g.children[0]
                let box = new THREE.Box3().setFromObject(inner)
                const dim = box.getSize(new THREE.Vector3())
                const curScale = inner.scale.x || 1
                const origMax = (Math.max(dim.x, dim.y, dim.z) || 1) / curScale
                inner.scale.setScalar(o.size / origMax)
                box = new THREE.Box3().setFromObject(inner)
                inner.position.sub(box.getCenter(new THREE.Vector3()))
                paso.size = o.size
            }

            if (g) {
                g.position.copy(paso.pos)
                g.rotation.set(paso.rot.x, paso.rot.y, paso.rot.z)
            }
            if (paso.marker) paso.marker.position.copy(paso.pos)

            return this.dump(id)
        },

        nudge(id, key, dir = 1, step) {
            const map = { x:'x', y:'y', z:'z', rx:'rx', ry:'ry', rz:'rz' }
            if (!map[key]) return `clave inválida: usa x,y,z,rx,ry,rz`
            const paso = PASOS.find(p => p.id === id)
            if (!paso) return `no existe "${id}"`
            const esRot = key[0] === 'r'
            const s = step != null ? step : (esRot ? 5 : 0.02)
            const D = Math.PI / 180
            let cur
            if (esRot) cur = Math.round(((paso.rot?.[key[1]] || 0) / D))
            else       cur = paso.pos[key]
            return this.set(id, { [key]: cur + dir * s })
        },

        dump(id) {
            const r = n => Math.round(n * 1000) / 1000
            const g = n => Math.round((n / (Math.PI / 180)) * 10) / 10
            const fmt = p => {
                const ro = p.rot || { x:0,y:0,z:0 }
                const rx = ro.x ? `Math.PI/180*${g(ro.x)}` : '0'
                const ry = ro.y ? `Math.PI/180*${g(ro.y)}` : '0'
                const rz = ro.z ? `Math.PI/180*${g(ro.z)}` : '0'
                return `[${p.id}] size: ${r(p.size)}, pos: new THREE.Vector3(${r(p.pos.x)}, ${r(p.pos.y)}, ${r(p.pos.z)}), rot: { x: ${rx}, y: ${ry}, z: ${rz} }`
            }
            const list = id ? [PASOS.find(p => p.id === id)].filter(Boolean) : PASOS
            const txt = list.map(fmt).join('\n')
            console.log(txt)
            return txt
        }
    }
}

function crearTexturaRadial(stops, size = 512) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    for (const [off, color] of stops) g.addColorStop(off, color)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
}

function crearTexturaMadera(size = 1024) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')

    ctx.fillStyle = '#8a5a33'
    ctx.fillRect(0, 0, size, size)

    const tablones = 8
    const alto = size / tablones
    const tonos = ['#7a4d2b', '#8a5a33', '#946134', '#7f5230', '#8e5e38']
    for (let i = 0; i < tablones; i++) {
        ctx.fillStyle = tonos[i % tonos.length]
        ctx.fillRect(0, i * alto, size, alto)

        const vetas = 26
        for (let v = 0; v < vetas; v++) {
            const y = i * alto + Math.random() * alto
            ctx.strokeStyle = `rgba(60,38,20,${0.04 + Math.random() * 0.10})`
            ctx.lineWidth = 0.5 + Math.random() * 1.2
            ctx.beginPath()
            ctx.moveTo(0, y)
            for (let x = 0; x <= size; x += 32) {
                ctx.lineTo(x, y + Math.sin(x * 0.012 + v) * 2.2 + (Math.random() - 0.5) * 1.5)
            }
            ctx.stroke()
        }

        ctx.strokeStyle = 'rgba(40,24,12,0.55)'
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(0, i * alto); ctx.lineTo(size, i * alto); ctx.stroke()
    }

    const vg = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.72)
    vg.addColorStop(0, 'rgba(255,235,200,0.18)')
    vg.addColorStop(0.6, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(30,16,6,0.45)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, size, size)

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return tex
}

function crearTexturaMaderaClara(size = 1024) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#d9bd91'
    ctx.fillRect(0, 0, size, size)

    const tablones = 6
    const alto = size / tablones
    const tonos = ['#dcc096', '#d3b485', '#e1c8a0', '#d7b98c', '#cdae80']
    for (let i = 0; i < tablones; i++) {
        ctx.fillStyle = tonos[i % tonos.length]
        ctx.fillRect(0, i * alto, size, alto)

        for (let v = 0; v < 22; v++) {
            const y = i * alto + Math.random() * alto
            ctx.strokeStyle = `rgba(150,110,65,${0.03 + Math.random() * 0.07})`
            ctx.lineWidth = 0.5 + Math.random() * 1.1
            ctx.beginPath(); ctx.moveTo(0, y)
            for (let x = 0; x <= size; x += 32) {
                ctx.lineTo(x, y + Math.sin(x * 0.012 + v) * 1.8 + (Math.random() - 0.5) * 1.2)
            }
            ctx.stroke()
        }

        ctx.strokeStyle = 'rgba(120,85,45,0.40)'
        ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(0, i * alto); ctx.lineTo(size, i * alto); ctx.stroke()
    }

    const vg = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.75)
    vg.addColorStop(0, 'rgba(255,245,225,0.15)')
    vg.addColorStop(1, 'rgba(120,85,45,0.10)')
    ctx.fillStyle = vg; ctx.fillRect(0, 0, size, size)

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = 8
    return tex
}

function crearTexturaLetreroComponentes() {
    const c = document.createElement('canvas')
    c.width = 2048; c.height = 200
    const ctx = c.getContext('2d')

    const g = ctx.createLinearGradient(0, 0, 0, c.height)
    g.addColorStop(0, '#cdab77'); g.addColorStop(0.5, '#dabb89'); g.addColorStop(1, '#c09a64')
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height)

    for (let i = 0; i < 90; i++) {
        ctx.strokeStyle = `rgba(130,95,55,${0.04 + Math.random() * 0.06})`
        ctx.lineWidth = 1
        const y = Math.random() * c.height
        ctx.beginPath(); ctx.moveTo(0, y)
        for (let x = 0; x <= c.width; x += 48) ctx.lineTo(x, y + Math.sin(x * 0.01) * 2)
        ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(95,65,35,0.55)'; ctx.lineWidth = 7
    ctx.strokeRect(16, 16, c.width - 32, c.height - 32)
    ctx.strokeStyle = 'rgba(255,246,228,0.35)'; ctx.lineWidth = 2
    ctx.strokeRect(22, 22, c.width - 44, c.height - 44)

    ;[[44, 44], [c.width - 44, 44], [44, c.height - 44], [c.width - 44, c.height - 44]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2)
        ctx.fillStyle = '#7a5a32'; ctx.fill()
        ctx.strokeStyle = 'rgba(40,26,12,0.6)'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.stroke()
    })

    if ('letterSpacing' in ctx) ctx.letterSpacing = '40px'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `800 116px 'Segoe UI', Arial, sans-serif`

    ctx.fillStyle = 'rgba(255,248,230,0.5)'
    ctx.fillText('COMPONENTES', c.width / 2 + 3, c.height / 2 + 4)
    ctx.fillStyle = '#46301a'
    ctx.fillText('COMPONENTES', c.width / 2, c.height / 2)

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return tex
}

function crearFondoGradiente() {
    const c = document.createElement('canvas')
    c.width = 16; c.height = 256
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0,   '#cdd6e0')
    g.addColorStop(0.55,'#aab6c4')
    g.addColorStop(1,   '#8b97a6')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 16, 256)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
}

function crearTexturaConcreto(size = 512) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#6f6a63'
    ctx.fillRect(0, 0, size, size)

    for (let i = 0; i < 40; i++) {
        const x = Math.random() * size, y = Math.random() * size
        const r = 30 + Math.random() * 90
        const gr = ctx.createRadialGradient(x, y, 0, x, y, r)
        const tono = Math.random() > 0.5 ? '255,255,255' : '60,66,72'
        gr.addColorStop(0, `rgba(${tono},${0.03 + Math.random() * 0.05})`)
        gr.addColorStop(1, `rgba(${tono},0)`)
        ctx.fillStyle = gr
        ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }

    for (let i = 0; i < 2400; i++) {
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '40,44,50'},${Math.random() * 0.08})`
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1)
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(5, 5)
    return tex
}

function crearTexturaPisoModerno(size = 1024) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    const half = size / 2

    const baseTones = ['#3b414a', '#363b44', '#3f4651', '#383e47']
    const drawTile = (tx, ty, tone) => {

        const g = ctx.createLinearGradient(tx, ty, tx + half, ty + half)
        g.addColorStop(0, tone)
        g.addColorStop(1, '#2e333b')
        ctx.fillStyle = g
        ctx.fillRect(tx, ty, half, half)

        for (let v = 0; v < 7; v++) {
            ctx.strokeStyle = `rgba(155,170,195,${0.04 + Math.random() * 0.06})`
            ctx.lineWidth = 0.6 + Math.random() * 1.6
            ctx.beginPath()
            let x = tx + Math.random() * half, y = ty + Math.random() * half
            ctx.moveTo(x, y)
            for (let s = 0; s < 6; s++) {
                x += (Math.random() - 0.5) * half * 0.5
                y += (Math.random() - 0.4) * half * 0.4
                ctx.lineTo(x, y)
            }
            ctx.stroke()
        }

        const sg = ctx.createRadialGradient(tx + half * 0.35, ty + half * 0.30, 0, tx + half * 0.35, ty + half * 0.30, half * 0.85)
        sg.addColorStop(0, 'rgba(225,235,250,0.06)')
        sg.addColorStop(1, 'rgba(225,235,250,0)')
        ctx.fillStyle = sg
        ctx.fillRect(tx, ty, half, half)
    }

    drawTile(0, 0, baseTones[0]);    drawTile(half, 0, baseTones[1])
    drawTile(0, half, baseTones[2]); drawTile(half, half, baseTones[3])

    ctx.strokeStyle = 'rgba(8,10,13,0.9)'
    ctx.lineWidth = size * 0.011
    ;[0, half].forEach(p => {
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke()
    })

    ctx.strokeStyle = 'rgba(130,145,170,0.22)'
    ctx.lineWidth = 1.5
    ;[3, half + 3].forEach(p => {
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke()
    })

    for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '215,225,240' : '12,15,20'},${Math.random() * 0.05})`
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1)
    }

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = 8
    return tex
}

function crearTexturaPegboard(size = 512) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')

    ctx.fillStyle = '#d9cbb2'
    ctx.fillRect(0, 0, size, size)

    for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = `rgba(150,120,80,${0.02 + Math.random() * 0.04})`
        ctx.lineWidth = 1
        const y = Math.random() * size
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke()
    }

    const paso = size / 16
    for (let x = paso / 2; x < size; x += paso) {
        for (let y = paso / 2; y < size; y += paso) {
            ctx.beginPath()
            ctx.arc(x, y, paso * 0.16, 0, Math.PI * 2)
            ctx.fillStyle = '#3a3128'
            ctx.fill()

            ctx.beginPath()
            ctx.arc(x + 0.6, y - 0.6, paso * 0.16, 0, Math.PI * 2)
            ctx.strokeStyle = 'rgba(255,255,255,0.25)'
            ctx.lineWidth = 1
            ctx.stroke()
        }
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(4, 1.6)
    return tex
}

function crearTexturaMat(size = 512) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#10333d'
    ctx.fillRect(0, 0, size, size)
    const paso = size / 12
    ctx.strokeStyle = 'rgba(120,200,210,0.16)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 12; i++) {
        ctx.beginPath(); ctx.moveTo(i * paso, 0); ctx.lineTo(i * paso, size); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i * paso); ctx.lineTo(size, i * paso); ctx.stroke()
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
}

function crearTexturaEtiqueta(nombre) {
    const c = document.createElement('canvas')
    c.width = 256; c.height = 42
    const ctx = c.getContext('2d')
    ctx.fillStyle = 'rgba(10,16,28,0.78)'
    ctx.fillRect(0, 0, 256, 42)
    ctx.fillStyle = '#eaf2ff'
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(nombre, 128, 21)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
}

function crearEstanteriaComponentes(grupo) {

    const BACK_Z  = SALA.zMax - 0.06
    const FRONT_Z = SALA.zMax - 0.60
    const CX_Z    = (BACK_Z + FRONT_Z) / 2
    const SHELF_D = BACK_Z - FRONT_Z
    const SHELF_Y = SALA.y0 + 1.62
    const BBH     = 1.18
    const W_TOTAL = 7.6
    const slotW   = W_TOTAL / PASOS.length
    const xStart  = -(W_TOTAL / 2)

    const backTex = crearTexturaMaderaClara(); backTex.repeat.set(3, 1)
    const repTex  = crearTexturaMaderaClara(); repTex.repeat.set(4, 1)
    const mBack  = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.62, metalness: 0.0 })
    const mRep   = new THREE.MeshStandardMaterial({ map: repTex, roughness: 0.50, metalness: 0.04 })
    const mTrim  = new THREE.MeshStandardMaterial({ map: crearTexturaMadera(), roughness: 0.55, metalness: 0.05 })
    const mPed   = new THREE.MeshStandardMaterial({ map: crearTexturaMadera(), roughness: 0.55, metalness: 0.05 })
    const mFrame = mTrim
    const mGlass = new THREE.MeshStandardMaterial({
        color: 0xeaf6ff, transparent: true, opacity: 0.06,
        roughness: 0.04, metalness: 0, depthWrite: false, side: THREE.DoubleSide
    })

    const bb = new THREE.Mesh(new THREE.BoxGeometry(W_TOTAL + 0.44, BBH, 0.06), mBack)
    bb.position.set(0, SHELF_Y + BBH / 2, BACK_Z)
    bb.receiveShadow = true
    grupo.add(bb)

    const rep = new THREE.Mesh(new THREE.BoxGeometry(W_TOTAL + 0.44, 0.055, SHELF_D), mRep)
    rep.position.set(0, SHELF_Y - 0.028, CX_Z)
    rep.castShadow = rep.receiveShadow = true
    grupo.add(rep)

    const front = new THREE.Mesh(new THREE.BoxGeometry(W_TOTAL + 0.44, 0.090, 0.032), mTrim)
    front.position.set(0, SHELF_Y + 0.008, FRONT_Z - 0.016)
    front.castShadow = true
    grupo.add(front)

    const ledStrip = new THREE.Mesh(
        new THREE.BoxGeometry(W_TOTAL + 0.20, 0.012, 0.012),
        new THREE.MeshStandardMaterial({ color: 0xffe8c4, emissive: 0xffd9a0, emissiveIntensity: 1.2, roughness: 1 })
    )
    ledStrip.position.set(0, SHELF_Y - 0.046, FRONT_Z - 0.005)
    grupo.add(ledStrip)

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(W_TOTAL + 0.54, 0.05, 0.12), mTrim)
    topBar.position.set(0, SHELF_Y + BBH + 0.005, BACK_Z + 0.02)
    topBar.castShadow = true
    grupo.add(topBar)

    ;[-(W_TOTAL / 2 + 0.21), W_TOTAL / 2 + 0.21].forEach(px => {
        const pilar = new THREE.Mesh(new THREE.BoxGeometry(0.07, BBH + 0.10, SHELF_D + 0.05), mTrim)
        pilar.position.set(px, SHELF_Y + (BBH + 0.10) / 2, CX_Z)
        pilar.castShadow = true
        grupo.add(pilar)
    })

    const letreroBoard = new THREE.Mesh(new THREE.BoxGeometry(W_TOTAL + 0.62, 0.30, 0.07), mTrim)
    letreroBoard.position.set(0, SHELF_Y + BBH + 0.17, BACK_Z - 0.01)
    letreroBoard.castShadow = true
    grupo.add(letreroBoard)
    const letrero = new THREE.Mesh(
        new THREE.PlaneGeometry(W_TOTAL + 0.50, 0.25),
        new THREE.MeshStandardMaterial({ map: crearTexturaLetreroComponentes(), roughness: 0.5, side: THREE.DoubleSide })
    )
    letrero.position.set(0, SHELF_Y + BBH + 0.17, BACK_Z - 0.055)
    letrero.rotation.y = Math.PI
    grupo.add(letrero)

    const foco = new THREE.PointLight(0xffe6c0, 3.2, 5.5, 2)
    foco.position.set(0, SHELF_Y + BBH + 0.10, CX_Z)
    grupo.add(foco)

    const tubo = new THREE.Mesh(
        new THREE.BoxGeometry(W_TOTAL - 0.1, 0.03, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xfff4e2, emissive: 0xffe7c2, emissiveIntensity: 1.8, roughness: 1 })
    )
    tubo.position.set(0, SHELF_Y + BBH - 0.05, BACK_Z - 0.14)
    grupo.add(tubo)

    const glass = new THREE.Mesh(
        new THREE.BoxGeometry(W_TOTAL + 0.06, BBH - 0.05, 0.012),
        mGlass
    )
    glass.position.set(0, SHELF_Y + BBH / 2, FRONT_Z + 0.02)
    glass.renderOrder = 3
    grupo.add(glass)

    PASOS.forEach((paso, i) => {
        const cx = xStart + slotW * (i + 0.5)
        const slotGrupo = new THREE.Group()

        slotGrupo.position.set(cx, SHELF_Y, CX_Z)

        const hitbox = new THREE.Mesh(
            new THREE.BoxGeometry(slotW * 0.90, BBH - 0.10, SHELF_D - 0.04),
            new THREE.MeshBasicMaterial({ visible: false })
        )
        hitbox.position.y = (BBH - 0.10) / 2
        hitbox.userData = { tipo: 'shelf-item', pasoId: paso.id, idx: i }
        slotGrupo.add(hitbox)
        shelfMeshes.push(hitbox)

        const pedW = slotW * 0.76
        const ped = new THREE.Mesh(new THREE.BoxGeometry(pedW, 0.022, 0.38), mPed)
        ped.position.set(0, 0.011, -0.02)
        ped.castShadow = true
        slotGrupo.add(ped)

        const lc = paso.color
        const ledPed = new THREE.Mesh(
            new THREE.BoxGeometry(pedW * 0.86, 0.008, 0.008),
            new THREE.MeshStandardMaterial({ color: lc, emissive: lc, emissiveIntensity: 1.8, roughness: 1 })
        )
        ledPed.position.set(0, 0.022, FRONT_Z - CX_Z + 0.05)
        slotGrupo.add(ledPed)

        const ph = new THREE.Mesh(
            new THREE.BoxGeometry(slotW * 0.44, 0.22, 0.12),
            new THREE.MeshStandardMaterial({
                color: paso.color, emissive: paso.color, emissiveIntensity: 0.30,
                metalness: 0.15, roughness: 0.55
            })
        )
        ph.position.set(0, 0.022 + 0.11 + 0.004, -0.02)
        ph.userData.isPlaceholder = true
        ph.castShadow = true
        slotGrupo.add(ph)

        const npGrp = new THREE.Group()
        const placa = new THREE.Mesh(
            new THREE.BoxGeometry(slotW * 0.82, 0.062, 0.009),
            new THREE.MeshStandardMaterial({ color: 0x5a4632, metalness: 0.2, roughness: 0.6 })
        )
        npGrp.add(placa)
        const labelPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(slotW * 0.76, 0.048),
            new THREE.MeshBasicMaterial({ map: crearTexturaEtiqueta(paso.nombre), transparent: true, depthWrite: false, side: THREE.DoubleSide })
        )
        labelPlane.position.z = 0.006
        npGrp.add(labelPlane)
        npGrp.position.set(0, -0.020, FRONT_Z - CX_Z + 0.016)
        npGrp.rotation.x = -0.22
        slotGrupo.add(npGrp)

        if (i > 0) {
            const div = new THREE.Mesh(
                new THREE.BoxGeometry(0.013, BBH - 0.12, 0.020),
                mFrame
            )
            div.position.set(-slotW / 2, BBH / 2, BACK_Z - CX_Z + 0.04)
            slotGrupo.add(div)
        }

        grupo.add(slotGrupo)
        shelfSlotObjs[paso.id] = slotGrupo
    })
}

function prepararVisibilidadModelo(obj) {
    obj.traverse(n => {
        if (!n.isMesh) return
        n.castShadow = true
        n.receiveShadow = true
        if (n.material) {
            const mats = Array.isArray(n.material) ? n.material : [n.material]
            mats.forEach(mat => {
                mat.side = THREE.DoubleSide
                mat.depthTest = true
                mat.depthWrite = true
                if (mat.transparent && mat.opacity < 1) {
                    mat.transparent = false
                }
            })
        }
    })
}

function actualizarSlotEstante(paso, innerObj) {
    const slotGrupo = shelfSlotObjs[paso.id]
    if (!slotGrupo) return

    const ph = slotGrupo.children.find(c => c.userData.isPlaceholder)
    if (ph) slotGrupo.remove(ph)

    const DISP_MAX = 0.40
    const clone = innerObj.clone(true)
    const shelfScale = paso.shelfScale ?? 1
    clone.scale.multiplyScalar((DISP_MAX / paso.size) * shelfScale)

    clone.rotation.set(
        paso.shelfRotX ?? 0,
        paso.shelfRotY ?? -Math.PI / 5,
        paso.shelfRotZ ?? 0
    )

    clone.position.set(0, paso.shelfOffsetY ?? 0, paso.shelfOffsetZ ?? -0.02)

    const bbox = new THREE.Box3().setFromObject(clone)
    const baseOffset = paso.id === 'mb' ? 0.028 : 0.004
    clone.position.y = 0.022 - bbox.min.y + baseOffset

    let display = null
    try { display = fusionarMallasEstante(clone) } catch (e) { display = null }

    if (display) {
        display.traverse(n => {
            if (!n.isMesh) return
            n.castShadow = false; n.receiveShadow = false
            const mats = Array.isArray(n.material) ? n.material : [n.material]
            mats.forEach(mat => {
                if (!mat) return
                mat.side = THREE.DoubleSide
                if (mat.transparent && mat.opacity < 1) mat.transparent = false
            })
        })
    } else {

        prepararVisibilidadModelo(clone)
        clone.traverse(n => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = false } })
        display = clone
    }

    display.userData.isDisplayClone = true
    slotGrupo.add(display)
}

function fusionarMallasEstante(root) {
    root.updateWorldMatrix(true, true)
    const porMaterial = new Map()
    root.traverse(n => {
        if (!n.isMesh || !n.geometry || !n.geometry.attributes.position) return
        const mat = Array.isArray(n.material) ? n.material[0] : n.material
        if (!mat) return
        let g = n.geometry.clone()
        g.applyMatrix4(n.matrixWorld)
        if (!g.attributes.normal) g.computeVertexNormals()
        if (!g.attributes.uv) {
            const c = g.attributes.position.count
            g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c * 2), 2))
        }

        for (const name of Object.keys(g.attributes)) {
            if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name)
        }
        g = g.toNonIndexed()
        if (!porMaterial.has(mat)) porMaterial.set(mat, [])
        porMaterial.get(mat).push(g)
    })
    if (porMaterial.size === 0) return null
    const grupo = new THREE.Group()
    for (const [mat, geos] of porMaterial) {
        const merged = geos.length > 1 ? mergeGeometries(geos, false) : geos[0]
        if (merged) grupo.add(new THREE.Mesh(merged, mat))
    }
    return grupo
}

function agarrarComponente(pasoId) {
    const paso = PASOS.find(p => p.id === pasoId)
    if (!paso) return

    const slotGrupo = shelfSlotObjs[pasoId]
    if (slotGrupo) slotGrupo.visible = false

    if (heldMesh) scene.remove(heldMesh)
    heldMesh = new THREE.Group()
    const modelGrp = modelos3D[paso.id]
    if (modelGrp && modelGrp.children[0]) {
        const innerClone = modelGrp.children[0].clone(true)
        const HELD_SIZE = 0.18
        innerClone.scale.multiplyScalar(HELD_SIZE / paso.size)
        innerClone.position.set(0, 0, 0)
        innerClone.rotation.set(paso.rot?.x || 0, paso.rot?.y || 0, paso.rot?.z || 0)
        heldMesh.add(innerClone)
    } else {
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.17, 0.14),
            new THREE.MeshStandardMaterial({ color: paso.color, emissive: paso.color, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.45 })
        )
        heldMesh.add(box)
    }
    const lbl = new THREE.Mesh(
        new THREE.PlaneGeometry(0.30, 0.075),
        new THREE.MeshBasicMaterial({ map: crearTexturaEtiqueta(paso.nombre), transparent: true, depthWrite: false, side: THREE.DoubleSide })
    )
    lbl.position.y = 0.16
    heldMesh.add(lbl)
    scene.add(heldMesh)

    heldComponent = paso
    appendLog(`Agarraste: ${paso.nombre}`, 'info')
    droneHabla(`Tienes "${paso.nombre}" en la mano. Acércate al PC, apunta al disco luminoso y presiona E.`)
    setHint(`<strong>En mano: ${paso.nombre}</strong> — acércate al PC, apunta al disco y presiona <strong>E</strong>. Presiona <strong>Q</strong> para soltar.`)
    actualizarOverlayWalk()
}

function soltarComponente() {
    if (!heldComponent) return
    const slotGrupo = shelfSlotObjs[heldComponent.id]
    if (slotGrupo) slotGrupo.visible = true
    if (heldMesh) { scene.remove(heldMesh); heldMesh = null }
    const nombre = heldComponent.nombre
    heldComponent = null
    droneHabla(`"${nombre}" devuelto a la estantería.`)
    setHint('Acércate a la estantería y presiona <strong>E</strong> para agarrar un componente.')
    actualizarOverlayWalk()
}

function soltarComponenteInstalado(pasoId) {
    const slotGrupo = shelfSlotObjs[pasoId]
    if (slotGrupo) {

        slotGrupo.traverse(n => {
            if (n.isMesh && !n.userData.isPlaceholder) {
                if (n.material) {
                    n.material = n.material.clone()
                    n.material.opacity = 0.35
                    n.material.transparent = true
                    n.material.emissiveIntensity = 0
                }
            }
        })
        slotGrupo.visible = true
    }
    if (heldMesh) { scene.remove(heldMesh); heldMesh = null }
    heldComponent = null
}

function intentarInstalar() {
    if (!heldComponent) return
    const needed = PASOS[indiceActual]
    if (!needed) return

    if (heldComponent.id === needed.id) {

        if (tieneProcedimiento(needed.id)) iniciarProcedimiento(needed)
        else finalizarPaso(heldComponent)
    } else {

        erroresSesion++
        const elapsed = Math.round((Date.now() - sessionStartTime) / 1000)
        registrarEvento({
            tipo: 'error_pieza',
            componenteId: heldComponent.id,
            componenteEsperado: needed.id,
            segundos: elapsed
        })
        droneHabla(`¡Incorrecto! Necesitas "${needed.nombre}", no "${heldComponent.nombre}".`)
        appendLog(`Componente incorrecto: tienes "${heldComponent.nombre}", se necesita "${needed.nombre}".`, 'warn')
        setHint(`<strong>Incorrecto.</strong> Llevas "<em>${heldComponent.nombre}</em>" pero se necesita "<strong>${needed.nombre}</strong>".`)

        if (heldMesh) {
            let cnt = 0
            const iv = setInterval(() => {
                if (!heldMesh) { clearInterval(iv); return }
                heldMesh.rotation.z = cnt % 2 === 0 ? 0.14 : -0.14
                if (++cnt >= 8) { clearInterval(iv); if (heldMesh) heldMesh.rotation.z = 0 }
            }, 55)
        }
    }
}

function interactuarE() {
    if (!walkControls?.isLocked) return

    const eRay = new THREE.Raycaster()
    eRay.setFromCamera({ x: 0, y: 0 }, camera)
    eRay.far = 3.2

    if (!heldComponent) {

        const hits = eRay.intersectObjects(shelfMeshes)
        if (hits.length > 0 && hits[0].object.userData.tipo === 'shelf-item') {
            const pasoId = hits[0].object.userData.pasoId
            const pasoIdx = PASOS.findIndex(p => p.id === pasoId)
            if (pasoIdx < indiceActual) {
                droneHabla('Este componente ya está instalado en el PC.')
                return
            }
            agarrarComponente(pasoId)
        } else {
            droneHabla('Acércate a la estantería (detrás de ti) y apunta a un componente para agarrarlo.')
        }
    } else {

        const discHits = eRay.intersectObjects(slotDiscs)
        const activeDisc = discHits.find(h => h.object.userData.id === PASOS[indiceActual]?.id)
        if (activeDisc) {
            intentarInstalar()
        } else {

            const shelfHits = eRay.intersectObjects(shelfMeshes)
            if (shelfHits.length > 0) {
                soltarComponente()
            } else {
                droneHabla(`Llevas "${heldComponent.nombre}". Apunta al disco luminoso del PC (E) o presiona Q para soltar.`)
            }
        }
    }
}

const PROCEDIMIENTOS = { cpu: construirProcedimientoCPU, mb: construirProcedimientoMB, cooler: construirProcedimientoCooler, ram: construirProcedimientoRAM, gpu: construirProcedimientoGPU, power: construirProcedimientoPSU }

function tieneProcedimiento(id) { return !!PROCEDIMIENTOS[id] }

function iniciarProcedimiento(paso) {
    if (procActivo) return
    const construir = PROCEDIMIENTOS[paso.id]
    if (!construir) { finalizarPaso(paso); return }

    if (walkControls?.isLocked) { iniciandoProc = true; walkControls.unlock() }
    walkMode = false
    const orbitaPrev = controls ? controls.enabled : false
    if (controls) controls.enabled = false
    if (heldMesh) heldMesh.visible = false
    const ch = document.getElementById('crosshair'); if (ch) ch.style.display = 'none'

    const grupo = new THREE.Group()
    grupo.position.copy(paso.pos)
    scene.add(grupo)

    procActivo = {
        paso, grupo, pasos: [], idx: 0, errores: 0, bloqueado: false,
        hotspots: [], focusTarget: paso.pos.clone(), orbitaPrev,
        hotspot(mesh, data) { mesh.userData.proc = data; grupo.add(mesh); this.hotspots.push(mesh); return mesh }
    }
    procActivo.pasos = construir(procActivo)

    const off = procActivo.focusOffset || new THREE.Vector3(0.18, 0.16, 0.62)
    enfocarCamara(procActivo.focusTarget.clone().add(off), procActivo.focusTarget.clone(), 0.75)
    mostrarPanelProc()
    appendLog(`Instalación guiada de "${paso.nombre}".`, 'info')
    activarPasoProc()
}

function activarPasoProc() {
    const P = procActivo; if (!P) return
    const paso = P.pasos[P.idx]
    if (!paso) { terminarProcedimiento(); return }
    P.bloqueado = false
    setHint(`<strong>Paso ${P.idx + 1}/${P.pasos.length}: ${paso.titulo}</strong> — ${paso.instruccion}`)
    droneHabla(paso.instruccion)
    paso.activar(P)
    actualizarPanelProc()
}

function clicProcedimiento(e) {
    const P = procActivo; if (!P || P.bloqueado) return
    const rect = canvas.getBoundingClientRect()
    mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
    mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(P.hotspots, true)
    if (!hits.length) return
    let obj = hits[0].object
    while (obj && !obj.userData.proc) obj = obj.parent
    if (!obj) return
    const d = obj.userData.proc
    if (d.accion === 'ok') {
        P.bloqueado = true
        const done = () => avanzarPasoProc()
        if (d.alAcertar) d.alAcertar(done); else done()
    } else if (d.accion === 'mal') {
        P.errores++; erroresSesion++
        droneHabla(d.motivo || 'Eso no es correcto. Observa bien e inténtalo de nuevo.')
        appendLog(`Paso incorrecto en "${P.paso.nombre}".`, 'warn')
    } else if (d.accion === 'espera') {

        droneHabla(d.espera || 'Sigue el orden indicado (el resaltado es el siguiente).')
    }

}

function avanzarPasoProc() {
    const P = procActivo; if (!P) return
    P.hotspots.forEach(h => P.grupo.remove(h))
    P.hotspots = []
    P.idx++
    if (P.idx >= P.pasos.length) terminarProcedimiento()
    else activarPasoProc()
}

function terminarProcedimiento() {
    const P = procActivo; if (!P) return
    const paso = P.paso, errores = P.errores, orbitaPrev = P.orbitaPrev
    ocultarPanelProc()
    scene.remove(P.grupo); disposeGroup(P.grupo)
    procActivo = null
    appendLog(`Procedimiento de "${paso.nombre}" completado con ${errores} error(es).`, 'success')

    enfocarCamara(new THREE.Vector3(0, SALA.y0 + ALTURA_OJOS, 3.2), new THREE.Vector3(0, 1.05, -0.2), 0.75, () => {
        if (controls) controls.enabled = orbitaPrev
        finalizarPaso(paso)
    })
}

function cancelarProcedimiento() {
    const P = procActivo; if (!P) return
    const paso = P.paso, orbitaPrev = P.orbitaPrev
    ocultarPanelProc()
    scene.remove(P.grupo); disposeGroup(P.grupo)
    procActivo = null
    appendLog(`Instalación de "${paso.nombre}" cancelada.`, 'system')
    if (heldComponent) soltarComponente()
    enfocarCamara(new THREE.Vector3(0, SALA.y0 + ALTURA_OJOS, 3.2), new THREE.Vector3(0, 1.05, -0.2), 0.6, () => {
        if (controls) controls.enabled = orbitaPrev
        actualizarOverlayWalk()
    })
}

function enfocarCamara(toPos, toLook, dur = 0.7, onDone = null) {
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd)
    camTween = {
        fromPos: camera.position.clone(), toPos: toPos.clone(),
        fromLook: camera.position.clone().add(fwd), toLook: toLook.clone(),
        t: 0, dur, onDone
    }
}

function tweenProc(applyFn, from, to, ms, done) {
    const t0 = performance.now()
    function step(now) {
        const k = Math.min(1, (now - t0) / ms)
        const e = k * k * (3 - 2 * k)
        applyFn(from + (to - from) * e)
        if (k < 1) requestAnimationFrame(step)
        else if (done) done()
    }
    requestAnimationFrame(step)
}

function disposeGroup(g) {
    g.traverse(o => {
        if (o.isMesh) {
            o.geometry?.dispose?.()
            const m = o.material
            ;(Array.isArray(m) ? m : [m]).forEach(x => x?.dispose?.())
        }
    })
}

function mostrarPanelProc() {
    let el = document.getElementById('proc-panel')
    if (!el) {
        el = document.createElement('div')
        el.id = 'proc-panel'
        el.style.cssText = 'position:absolute;top:16px;right:16px;z-index:40;width:286px;background:rgba(10,18,30,0.92);color:#eaf2ff;border:1px solid rgba(120,180,255,0.25);border-radius:12px;padding:14px 16px;font-family:Inter,system-ui,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,.45);backdrop-filter:blur(4px);'
        ;(document.getElementById('canvas-container') || document.body).appendChild(el)
    }
    el.style.display = 'block'
    actualizarPanelProc()
}

function actualizarPanelProc() {
    const P = procActivo; const el = document.getElementById('proc-panel')
    if (!P || !el) return
    el.innerHTML = `
        <div style="font-weight:700;font-size:.95rem;">Instalación guiada</div>
        <div style="color:#9fb3c8;font-size:.8rem;margin-bottom:11px;">${P.paso.nombre}</div>
        <ol style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">
            ${P.pasos.map((s, i) => {
                const st = i < P.idx ? 'done' : i === P.idx ? 'cur' : 'pend'
                const ic = st === 'done' ? '✓' : st === 'cur' ? '▸' : (i + 1)
                const col = st === 'done' ? '#22c55e' : st === 'cur' ? '#3a8bff' : '#5b6b7d'
                return `<li style="display:flex;gap:9px;align-items:flex-start;opacity:${st === 'pend' ? 0.55 : 1};">
                    <span style="flex:0 0 19px;height:19px;border-radius:50%;background:${st === 'cur' ? 'rgba(58,139,255,.18)' : 'transparent'};border:1.5px solid ${col};color:${col};font-size:.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;">${ic}</span>
                    <span style="font-size:.82rem;line-height:1.3;${st === 'cur' ? 'color:#eaf2ff;font-weight:600;' : 'color:#b8c6d6;'}">${s.titulo}</span>
                </li>`
            }).join('')}
        </ol>
        <div style="margin-top:12px;font-size:.78rem;color:#cdd9e8;border-top:1px solid rgba(255,255,255,.08);padding-top:10px;line-height:1.4;">${P.pasos[P.idx]?.instruccion || ''}</div>
        <button id="proc-cancelar" style="margin-top:11px;width:100%;padding:7px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#9fb3c8;font-size:.78rem;cursor:pointer;">Cancelar (Esc)</button>`
    el.querySelector('#proc-cancelar')?.addEventListener('click', cancelarProcedimiento)
}

function ocultarPanelProc() {
    const el = document.getElementById('proc-panel')
    if (el) el.style.display = 'none'
}

function crearHotspot(color = 0x3a8bff, r = 0.028) {
    const g = new THREE.Group()
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.68, r, 28),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
    )
    g.add(ring)
    const hit = new THREE.Mesh(
        new THREE.CircleGeometry(r * 2.6, 20),
        new THREE.MeshBasicMaterial({ visible: false })
    )
    g.add(hit)
    g.userData.ring = ring
    g.userData.pulse = true
    return g
}

function crearNumeroLabel(n) {
    const c = document.createElement('canvas'); c.width = c.height = 64
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#ffd54a'; ctx.font = 'bold 46px Inter, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(n), 32, 35)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
    return new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
}

function crearTextoLabel(texto, ancho = 0.15, color = '#cfe3ff') {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64
    const ctx = c.getContext('2d')
    ctx.fillStyle = 'rgba(8,16,28,0.85)'; ctx.fillRect(0, 0, 256, 64)
    ctx.strokeStyle = 'rgba(120,180,255,0.5)'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 252, 60)
    ctx.fillStyle = color; ctx.font = 'bold 30px Inter, monospace'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(texto, 128, 35)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
    return new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho * 0.25),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
}

function crearTrianguloProc(color = 0xffd54a, s = 0.014) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, s, 0, -s * 0.9, -s * 0.7, 0, s * 0.9, -s * 0.7, 0], 3))
    geo.computeVertexNormals()
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, side: THREE.DoubleSide }))
}

function ponerTornillo(G, x, y, s = 1) {
    const g = new THREE.Group()
    const metal = new THREE.MeshStandardMaterial({ color: 0xc0c6cc, metalness: 0.9, roughness: 0.3 })
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * s, 0.008 * s, 0.02 * s, 12), metal)
    cuerpo.rotation.x = Math.PI / 2; g.add(cuerpo)
    const cabeza = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * s, 0.014 * s, 0.006 * s, 14), metal)
    cabeza.rotation.x = Math.PI / 2; cabeza.position.z = 0.012 * s; g.add(cabeza)
    const zArriba = 0.06 * s, zFinal = 0.014 * s
    g.position.set(x, y, zArriba)
    G.add(g)

    tweenProc(v => { g.position.z = v; g.rotation.z = (zArriba - v) * 60 }, zArriba, zFinal, 420)
}

function conectarCable(G, a, b) {
    const dir = new THREE.Vector3().subVectors(b, a)
    const len = dir.length() || 0.001
    const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, len, 8),
        new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.7 })
    )
    cable.position.copy(a).addScaledVector(dir, 0.5)
    cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    cable.scale.y = 0.01
    G.add(cable)
    const plug = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.014, 0.014),
        new THREE.MeshStandardMaterial({ color: 0x222831, metalness: 0.4, roughness: 0.6 }))
    plug.position.copy(b); G.add(plug)
    tweenProc(v => { cable.scale.y = v }, 0.01, 1, 420)
}

function construirProcedimientoCPU(P) {
    const G = P.grupo
    P.focusOffset = new THREE.Vector3(0.10, 0.10, 0.58)
    const dark  = new THREE.MeshStandardMaterial({ color: 0x1c2530, metalness: 0.6, roughness: 0.5 })
    const metal = new THREE.MeshStandardMaterial({ color: 0x2b3440, metalness: 0.8, roughness: 0.35 })

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.012), dark)
    base.position.z = -0.006; G.add(base)
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.13), metal)
    inner.position.z = 0.002; G.add(inner)

    const triSocket = crearTrianguloProc(0xffd54a, 0.016)
    triSocket.position.set(-0.05, -0.05, 0.005); G.add(triSocket)

    const palanca = new THREE.Group()
    palanca.position.set(0.085, -0.07, 0.012)
    const barra = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.14, 0.012), metal)
    barra.position.y = 0.07; palanca.add(barra)
    const codo = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.014, 0.012), metal)
    codo.position.set(-0.022, 0.135, 0); palanca.add(codo)
    palanca.rotation.z = -Math.PI / 2.1
    G.add(palanca)

    const chip = new THREE.Group()
    const substrate = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.014),
        new THREE.MeshStandardMaterial({ color: 0x14130f, metalness: 0.25, roughness: 0.78 })
    )
    chip.add(substrate)
    const ihs = new THREE.Mesh(
        new THREE.BoxGeometry(0.092, 0.092, 0.016),
        new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.85, roughness: 0.3 })
    )
    ihs.position.z = 0.013; chip.add(ihs)
    const triChip = crearTrianguloProc(0xffd54a, 0.014)
    triChip.position.set(-0.05, -0.05, 0.023); chip.add(triChip)
    const parqueo = new THREE.Vector3(-0.20, 0.0, 0.085)
    chip.position.copy(parqueo)
    chip.visible = false
    G.add(chip)

    return [
        {
            titulo: 'Abrir el socket',
            instruccion: 'Haz clic en la palanca de retención para abrir el socket ZIF.',
            activar(P) {
                const hs = crearHotspot(0x3a8bff)
                hs.position.set(0.085, 0.07, 0.03)
                P.hotspot(hs, { accion: 'ok', alAcertar: done => tweenProc(v => { palanca.rotation.z = v }, palanca.rotation.z, -0.12, 450, done) })
            }
        },
        {
            titulo: 'Alinear el procesador',
            instruccion: 'El triángulo dorado del CPU debe coincidir con la marca del socket. Haz clic en esa esquina.',
            activar(P) {
                chip.visible = true
                const corners = [[-0.05, -0.05, true], [0.05, -0.05, false], [-0.05, 0.05, false], [0.05, 0.05, false]]
                corners.forEach(([x, y, ok]) => {
                    const hs = crearHotspot(0x3a8bff, 0.032)
                    hs.position.set(x, y, 0.02)
                    P.hotspot(hs, ok
                        ? { accion: 'ok', alAcertar: done => done() }
                        : { accion: 'mal', motivo: 'Esa no es la esquina: alinea el triángulo dorado del CPU con la marca del socket.' })
                })
            }
        },
        {
            titulo: 'Colocar el procesador',
            instruccion: 'Haz clic para depositar el procesador en el socket, sin forzarlo.',
            activar(P) {
                const hs = crearHotspot(0x22c55e, 0.046)
                hs.position.set(0, 0, 0.11)
                const desde = chip.position.clone()
                const destino = new THREE.Vector3(0, 0, 0.012)
                P.hotspot(hs, { accion: 'ok', alAcertar: done => tweenProc(v => chip.position.lerpVectors(desde, destino, v), 0, 1, 550, done) })
            }
        },
        {
            titulo: 'Cerrar el socket',
            instruccion: 'Baja la palanca para fijar el procesador en su lugar.',
            activar(P) {
                const hs = crearHotspot(0x3a8bff)
                hs.position.set(0.085, 0.07, 0.03)
                P.hotspot(hs, { accion: 'ok', alAcertar: done => tweenProc(v => { palanca.rotation.z = v }, palanca.rotation.z, -Math.PI / 2.1, 450, done) })
            }
        },
        {
            titulo: 'Pasta térmica',
            instruccion: 'Aplica un punto de pasta térmica del tamaño de un guisante en el centro del procesador.',
            activar(P) {
                const hs = crearHotspot(0xc8c8c8, 0.042)
                hs.position.set(0, 0, 0.05)
                P.hotspot(hs, {
                    accion: 'ok',
                    alAcertar: done => {
                        const pasta = new THREE.Mesh(
                            new THREE.SphereGeometry(0.016, 16, 12),
                            new THREE.MeshStandardMaterial({ color: 0xeef2f5, roughness: 0.3, metalness: 0.1 })
                        )
                        pasta.position.set(0, 0, 0.036); G.add(pasta)
                        pasta.scale.setScalar(0.01)
                        tweenProc(v => pasta.scale.set(v, v, v * 0.4), 0.01, 1, 380, done)
                    }
                })
            }
        }
    ]
}

function construirProcedimientoMB(P) {
    const G = P.grupo
    P.focusOffset = new THREE.Vector3(0, 0.28, 1.40)
    const verdePCB = new THREE.MeshStandardMaterial({ color: 0x14301f, metalness: 0.2, roughness: 0.8 })
    const metal    = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.35 })

    const bandeja = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.92, 0.014),
        new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.7, roughness: 0.45 }))
    bandeja.position.z = -0.03; G.add(bandeja)

    const corners = [[-0.44, -0.33], [0.44, -0.33], [-0.44, 0.33], [0.44, 0.33]]
    corners.forEach(([x, y]) => {
        const so = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 14), metal)
        so.rotation.x = Math.PI / 2; so.position.set(x, y, -0.012); G.add(so)
    })

    const placa = new THREE.Group()
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.78, 0.02), verdePCB)
    placa.add(pcb)
    const sock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x3a3f47, metalness: 0.6, roughness: 0.4 }))
    sock.position.set(-0.08, 0.12, 0.02); placa.add(sock)
    for (let i = 0; i < 4; i++) {
        const ram = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.30, 0.014),
            new THREE.MeshStandardMaterial({ color: 0x1b1b1b }))
        ram.position.set(0.20 + i * 0.04, 0.06, 0.02); placa.add(ram)
    }
    placa.position.set(0, 0, 0.32)
    G.add(placa)

    return [
        {
            titulo: 'Colocar la placa',
            instruccion: 'Alinea la placa sobre los separadores y haz clic para depositarla en la bandeja.',
            activar(P) {
                const hs = crearHotspot(0x3a8bff, 0.07)
                hs.position.set(0, 0, 0.34)
                P.hotspot(hs, { accion: 'ok', alAcertar: done => tweenProc(v => { placa.position.z = v }, placa.position.z, 0.012, 500, done) })
            }
        },
        {
            titulo: 'Atornillar en cruz',
            instruccion: 'Atornilla siguiendo los números (patrón en cruz). El tornillo resaltado es el siguiente.',
            activar(P) {
                const orden = [0, 3, 1, 2]
                let next = 0
                const puestos = new Set()
                const refs = [], labels = []

                function refrescar() {
                    refs.forEach((hs, i) => {
                        const placed = puestos.has(i)
                        const esSig = !placed && i === orden[next]
                        hs.userData.proc.accion = placed ? 'nada' : (esSig ? 'ok' : 'espera')
                        const ring = hs.userData.ring
                        ring.visible = !placed
                        ring.material.opacity = esSig ? 1 : 0.22
                        hs.userData.pulse = esSig
                        labels[i].visible = !placed
                        labels[i].material.opacity = esSig ? 1 : 0.4
                    })
                }

                corners.forEach(([x, y], i) => {
                    const hs = crearHotspot(0xffd54a, 0.05)
                    hs.position.set(x, y, 0.03)
                    P.hotspot(hs, {
                        accion: 'espera',
                        espera: 'Aprieta primero el tornillo resaltado (sigue los números).',
                        alAcertar: done => {
                            ponerTornillo(G, x, y, 2.6)
                            puestos.add(i); next++
                            if (next >= orden.length) done()
                            else { refrescar(); P.bloqueado = false; setHint(`<strong>Atornillar en cruz</strong> — quedan ${orden.length - next} tornillo(s).`) }
                        }
                    })
                    refs.push(hs)
                    const num = crearNumeroLabel(orden.indexOf(i) + 1)
                    num.position.set(x, y + 0.085, 0.04)
                    G.add(num); labels.push(num)
                })
                refrescar()
            }
        }
    ]
}

function construirProcedimientoCooler(P) {
    const G = P.grupo

    const cpuPos = (PASOS.find(p => p.id === 'cpu')?.pos || P.paso.pos).clone()
    G.position.copy(cpuPos)
    P.focusTarget = cpuPos.clone()
    P.focusOffset = new THREE.Vector3(0.12, 0.14, 0.72)
    const metal = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.35 })

    const socketRef = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.012),
        new THREE.MeshStandardMaterial({ color: 0x14130f, metalness: 0.3, roughness: 0.7 }))
    socketRef.position.z = -0.004; G.add(socketRef)
    const ihsRef = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.092, 0.012),
        new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.85, roughness: 0.3 }))
    ihsRef.position.z = 0.006; G.add(ihsRef)
    const pastaRef = new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0xeef2f5, roughness: 0.3 }))
    pastaRef.scale.set(1, 1, 0.4); pastaRef.position.z = 0.014; G.add(pastaRef)

    const headerMat = new THREE.MeshStandardMaterial({ color: 0x1b2330, metalness: 0.5, roughness: 0.5 })
    const headers = [
        { nombre: 'CPU_FAN', x: 0.21, y: 0.10, ok: true },
        { nombre: 'SYS_FAN', x: 0.21, y: -0.05, ok: false }
    ]
    headers.forEach(h => {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.018, 0.014), headerMat)
        box.position.set(h.x, h.y, 0.01); G.add(box)
        const lbl = crearTextoLabel(h.nombre, 0.13)
        lbl.position.set(h.x + 0.005, h.y + 0.035, 0.02); G.add(lbl)
    })

    const cool = new THREE.Group()
    const baseC = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.04), new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.8, roughness: 0.35 }))
    cool.add(baseC)
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.022, 24), new THREE.MeshStandardMaterial({ color: 0x14151a, metalness: 0.4, roughness: 0.6 }))
    fan.rotation.x = Math.PI / 2; fan.position.z = 0.031; cool.add(fan)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.026, 16), new THREE.MeshStandardMaterial({ color: 0xb23b34, metalness: 0.3, roughness: 0.5 }))
    hub.rotation.x = Math.PI / 2; hub.position.z = 0.034; cool.add(hub)
    const parqueo = new THREE.Vector3(-0.26, 0.0, 0.12)
    cool.position.copy(parqueo); cool.visible = false; G.add(cool)

    const clips = [-1, 1].map(sgn => {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.012), metal)
        c.position.set(sgn * 0.085, 0, 0.05); c.rotation.z = sgn * 0.6; c.visible = false; G.add(c)
        return c
    })
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.012), metal)
    cam.position.set(0.10, 0.07, 0.06); cam.rotation.z = -0.5; cam.visible = false; G.add(cam)

    return [
        {
            titulo: 'Colocar el disipador',
            instruccion: 'Apoya el disipador sobre el procesador (con la pasta). Haz clic para asentarlo.',
            activar(P) {
                cool.visible = true
                const hs = crearHotspot(0x22c55e, 0.05)
                hs.position.copy(parqueo).setZ(0.14)
                const desde = parqueo.clone(), destino = new THREE.Vector3(0, 0, 0.055)
                P.hotspot(hs, { accion: 'ok', alAcertar: done => tweenProc(v => cool.position.lerpVectors(desde, destino, v), 0, 1, 550, () => { clips.forEach(c => c.visible = true); cam.visible = true; done() }) })
            }
        },
        {
            titulo: 'Enganchar los clips',
            instruccion: 'Engancha los dos clips de retención a los lados del socket (en cualquier orden).',
            activar(P) {
                let hechos = 0
                ;[-1, 1].forEach((sgn, i) => {
                    const hs = crearHotspot(0x3a8bff, 0.03)
                    hs.position.set(sgn * 0.085, 0, 0.06)
                    P.hotspot(hs, {
                        accion: 'ok',
                        alAcertar: done => {
                            tweenProc(v => { clips[i].rotation.z = v }, clips[i].rotation.z, 0, 320)
                            hs.userData.proc.accion = 'nada'; hs.userData.ring.visible = false
                            hechos++
                            if (hechos >= 2) done()
                            else { P.bloqueado = false; setHint('Engancha también el otro clip.') }
                        }
                    })
                })
            }
        },
        {
            titulo: 'Bloquear la palanca',
            instruccion: 'Gira la palanca de leva para tensar el disipador contra el procesador.',
            activar(P) {
                const hs = crearHotspot(0x3a8bff, 0.032)
                hs.position.set(0.10, 0.07, 0.07)
                P.hotspot(hs, { accion: 'ok', alAcertar: done => tweenProc(v => { cam.rotation.z = v }, cam.rotation.z, -Math.PI / 2, 380, done) })
            }
        },
        {
            titulo: 'Conectar el ventilador',
            instruccion: 'Conecta el cable del ventilador al header correcto de la placa. ¿Cuál es?',
            activar(P) {
                headers.forEach(h => {
                    const hs = crearHotspot(h.ok ? 0x3a8bff : 0xff7676, 0.03)
                    hs.position.set(h.x, h.y, 0.03)
                    P.hotspot(hs, h.ok
                        ? { accion: 'ok', alAcertar: done => { conectarCable(G, new THREE.Vector3(0.06, -0.02, 0.05), new THREE.Vector3(h.x, h.y, 0.02)); done() } }
                        : { accion: 'mal', motivo: 'Ese es para los ventiladores del gabinete. El disipador del CPU va en el header CPU_FAN.' })
                })
            }
        }
    ]
}

function construirProcedimientoRAM(P) {
    const G = P.grupo
    P.focusOffset = new THREE.Vector3(0.05, 0.10, 0.76)

    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x14301f, metalness: 0.2, roughness: 0.8 })
    const negro  = new THREE.MeshStandardMaterial({ color: 0x1a1c21, metalness: 0.35, roughness: 0.75 })
    const metal  = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.35 })

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.38, 0.010), pcbMat)
    base.position.z = -0.006; G.add(base)

    const sockRef = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.010),
        new THREE.MeshStandardMaterial({ color: 0x2e3340, metalness: 0.5, roughness: 0.5 }))
    sockRef.position.set(-0.09, 0, 0.002); G.add(sockRef)
    const lblCpu = crearTextoLabel('CPU', 0.065)
    lblCpu.position.set(-0.09, 0, 0.010); G.add(lblCpu)

    const SLOT_H = 0.26
    const SLOT_W = 0.024
    const KEY_Y  = -0.042
    const slotX  =  0.05

    const slotBody = new THREE.Mesh(new THREE.BoxGeometry(SLOT_W, SLOT_H, 0.013), negro)
    slotBody.position.set(slotX, 0, 0.002); G.add(slotBody)

    const key = new THREE.Mesh(new THREE.BoxGeometry(SLOT_W + 0.002, 0.010, 0.016),
        new THREE.MeshStandardMaterial({ color: 0x060810 }))
    key.position.set(slotX, KEY_Y, 0.003); G.add(key)

    const clipMeshes = []
    ;[-1, 1].forEach(side => {
        const clip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.010, 0.010), metal)
        clip.position.set(slotX, side * (SLOT_H / 2 + 0.006), 0.016)
        G.add(clip)
        clipMeshes.push({ mesh: clip, side })
    })

    const stick = new THREE.Group()

    stick.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.23, 0.008), pcbMat))

    const hsBody = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.17, 0.018),
        new THREE.MeshStandardMaterial({ color: 0x1f2847, metalness: 0.80, roughness: 0.30 }))
    hsBody.position.set(0, 0.015, 0.010); stick.add(hsBody)

    const rgb = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.010, 0.020),
        new THREE.MeshStandardMaterial({ color: 0x5c63ff, emissive: 0x5c63ff, emissiveIntensity: 0.75 }))
    rgb.position.set(0, 0.100, 0.011); stick.add(rgb)

    for (let i = 0; i < 6; i++) {
        const chip = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 0.005),
            new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.9 }))
        chip.position.set(0, -0.075 + i * 0.030, 0.007); stick.add(chip)
    }

    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.010, 0.012),
        new THREE.MeshStandardMaterial({ color: 0x060810 }))
    notch.position.set(0, KEY_Y, 0); stick.add(notch)

    const parqueo = new THREE.Vector3(slotX - 0.22, 0, 0.18)
    stick.position.copy(parqueo); stick.visible = false
    G.add(stick)

    return [

        {
            titulo: 'Abrir los clips de retención',
            instruccion: 'Abre los dos seguros de la ranura DDR4 (superior e inferior) en cualquier orden.',
            activar(P) {
                let abiertos = 0
                clipMeshes.forEach(c => {
                    const hs = crearHotspot(0x3a8bff, 0.024)
                    hs.position.copy(c.mesh.position); hs.position.z += 0.020
                    P.hotspot(hs, {
                        accion: 'ok',
                        alAcertar: done => {

                            tweenProc(v => { c.mesh.rotation.z = v }, 0, c.side * 0.55, 280)
                            hs.userData.proc.accion = 'nada'; hs.userData.ring.visible = false
                            abiertos++
                            if (abiertos >= 2) done()
                            else { P.bloqueado = false; setHint('Abre también el clip del otro extremo.') }
                        }
                    })
                })
            }
        },

        {
            titulo: 'Alinear la muesca',
            instruccion: 'La muesca del módulo debe coincidir con la llave de la ranura. ¿En qué orientación encaja?',
            activar(P) {
                stick.visible = true
                stick.position.copy(parqueo)

                const hsOk = crearHotspot(0x22c55e, 0.034)
                hsOk.position.set(slotX - 0.04, KEY_Y, 0.12)
                P.hotspot(hsOk, { accion: 'ok', alAcertar: done => done() })

                const hsMal = crearHotspot(0xff7676, 0.034)
                hsMal.position.set(slotX - 0.04, -KEY_Y, 0.12)
                P.hotspot(hsMal, {
                    accion: 'mal',
                    motivo: 'La muesca no coincide con la llave. Los módulos DDR4 son asimétricos: solo encajan en una orientación para proteger los pines.'
                })
            }
        },

        {
            titulo: 'Insertar el módulo RAM',
            instruccion: 'Presiona el módulo hacia abajo con ambos pulgares hasta escuchar el clic. Los clips se cierran solos.',
            activar(P) {
                const desde   = parqueo.clone()
                const destino = new THREE.Vector3(slotX, 0, 0.010)
                stick.position.copy(desde)
                const hs = crearHotspot(0x22c55e, 0.050)
                hs.position.set(slotX - 0.11, 0, 0.20)
                P.hotspot(hs, {
                    accion: 'ok',
                    alAcertar: done => {
                        tweenProc(v => stick.position.lerpVectors(desde, destino, v), 0, 1, 550, () => {
                            clipMeshes.forEach(c => {
                                tweenProc(v => { c.mesh.rotation.z = v }, c.mesh.rotation.z, 0, 300)
                            })
                            done()
                        })
                    }
                })
            }
        }
    ]
}

function construirProcedimientoGPU(P) {
    const G = P.grupo
    P.focusOffset = new THREE.Vector3(0.10, 0.16, 0.98)

    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x14301f, metalness: 0.2, roughness: 0.8 })
    const negro  = new THREE.MeshStandardMaterial({ color: 0x1a1c21, metalness: 0.35, roughness: 0.75 })
    const metal  = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.35 })

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.30, 0.010), pcbMat)
    base.position.z = -0.006; G.add(base)

    const slotY = -0.08
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.013, 0.014), negro)
    slot.position.set(0, slotY, 0.002); G.add(slot)
    const lblSlot = crearTextoLabel('PCIe x16', 0.11)
    lblSlot.position.set(-0.02, slotY - 0.022, 0.010); G.add(lblSlot)

    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.010), metal)
    latch.position.set(0.155, slotY, 0.014)
    latch.rotation.z = -0.55
    G.add(latch)

    const gpu = new THREE.Group()

    gpu.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.010),
        new THREE.MeshStandardMaterial({ color: 0x0e1a0e, metalness: 0.25, roughness: 0.75 })))

    const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.10, 0.046),
        new THREE.MeshStandardMaterial({ color: 0x1c1e24, metalness: 0.65, roughness: 0.40 }))
    shroud.position.z = 0.026; gpu.add(shroud)

    ;[-0.07, 0.07].forEach(fx => {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.008, 24),
            new THREE.MeshStandardMaterial({ color: 0x111418, metalness: 0.4, roughness: 0.6 }))
        ring.rotation.x = Math.PI / 2; ring.position.set(fx, 0, 0.048); gpu.add(ring)
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.010, 14),
            new THREE.MeshStandardMaterial({ color: 0x232830, metalness: 0.3 }))
        hub.rotation.x = Math.PI / 2; hub.position.set(fx, 0, 0.052); gpu.add(hub)
    })

    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.13, 0.013), metal)
    bracket.position.set(0.145, 0, 0.002); gpu.add(bracket)

    const powerPort = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.015, 0.015),
        new THREE.MeshStandardMaterial({ color: 0x1a1d24, metalness: 0.4, roughness: 0.6 }))
    powerPort.position.set(0.08, 0.067, 0.006); gpu.add(powerPort)
    const lblPwr = crearTextoLabel('8-pin', 0.07)
    lblPwr.position.set(0.08, 0.088, 0.010); gpu.add(lblPwr)

    const parqueo = new THREE.Vector3(0, 0.20, 0.24)
    gpu.position.copy(parqueo); gpu.visible = false
    G.add(gpu)

    const opciones = [
        { nombre: 'PCIe 8-pin', ok: true,  x: -0.08, color: 0x252d42 },
        { nombre: 'EPS CPU',    ok: false, x:  0.16, color: 0x2d1a1a }
    ]
    const connGrupos = opciones.map(o => {
        const g = new THREE.Group()
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.020, 0.015),
            new THREE.MeshStandardMaterial({ color: o.color, metalness: 0.45, roughness: 0.6 })))
        const lbl = crearTextoLabel(o.nombre, 0.11)
        lbl.position.set(0, 0.026, 0); g.add(lbl)
        g.position.set(o.x, 0.13, 0.08)
        g.visible = false; G.add(g)
        return g
    })

    return [

        {
            titulo: 'Insertar en el slot PCIe x16',
            instruccion: 'Alinea la GPU con el slot PCIe x16 (el más largo de la placa) y empújala hasta escuchar el clic del seguro.',
            activar(P) {
                gpu.visible = true
                const desde   = parqueo.clone()
                const destino = new THREE.Vector3(0, slotY, 0.006)
                const hs = crearHotspot(0x22c55e, 0.060)
                hs.position.copy(desde); hs.position.z += 0.04
                P.hotspot(hs, {
                    accion: 'ok',
                    alAcertar: done => {
                        tweenProc(v => gpu.position.lerpVectors(desde, destino, v), 0, 1, 620, () => {
                            tweenProc(v => { latch.rotation.z = v }, latch.rotation.z, 0, 340, done)
                        })
                    }
                })
            }
        },

        {
            titulo: 'Fijar el bracket con tornillo',
            instruccion: 'Atornilla el bracket de la GPU al panel trasero del gabinete para que no se mueva.',
            activar(P) {
                const hs = crearHotspot(0xffd54a, 0.034)
                hs.position.set(0.145, 0.072, 0.036)
                P.hotspot(hs, {
                    accion: 'ok',
                    alAcertar: done => {
                        ponerTornillo(G, 0.145, 0.072, 2.0)
                        done()
                    }
                })
            }
        },

        {
            titulo: 'Conectar el cable de poder',
            instruccion: 'La GPU exige alimentación directa de la fuente. ¿Cuál cable conectas al puerto 8-pin de la GPU?',
            activar(P) {
                connGrupos.forEach(g => { g.visible = true })
                opciones.forEach((o, i) => {
                    const hs = crearHotspot(o.ok ? 0x3a8bff : 0xff7676, 0.030)
                    hs.position.set(o.x, 0.13, 0.10)
                    P.hotspot(hs, o.ok
                        ? {
                            accion: 'ok',
                            alAcertar: done => {

                                const puertoPos = new THREE.Vector3(0.08, slotY + 0.067, 0.016)
                                conectarCable(G, new THREE.Vector3(o.x, 0.13, 0.07), puertoPos)
                                done()
                            }
                          }
                        : {
                            accion: 'mal',
                            motivo: 'El conector EPS 8-pin alimenta el procesador, no la GPU. Busca el cable marcado "PCIe" o "VGA" en la fuente de poder.'
                          })
                })
            }
        }
    ]
}

function construirProcedimientoPSU(P) {
    const G = P.grupo

    const mbPos = (PASOS.find(p => p.id === 'mb')?.pos || P.paso.pos).clone()
    G.position.copy(mbPos)
    P.focusTarget = mbPos.clone()
    P.focusOffset = new THREE.Vector3(0.22, 0.06, 0.56)

    const negro    = new THREE.MeshStandardMaterial({ color: 0x1a1c21, metalness: 0.35, roughness: 0.75 })
    const dorado   = new THREE.MeshStandardMaterial({ color: 0xd4aa50, metalness: 0.90, roughness: 0.20 })
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.80 })

    const POS_ATX  = new THREE.Vector3( 0.18,  0.01, 0.005)
    const POS_EPS  = new THREE.Vector3(-0.14,  0.13, 0.005)
    const POS_PCIE = new THREE.Vector3( 0.05, -0.09, 0.005)

    function crearSocket(cols, rows, w, h) {
        const g = new THREE.Group()
        g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), negro))
        const sw = (w - 0.010) / Math.max(cols - 1, 1)
        const sh = (h - 0.010) / Math.max(rows - 1, 1)
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const pin = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.007), dorado)
            pin.position.set(-w / 2 + 0.005 + c * sw, -h / 2 + 0.005 + r * sh, 0.010)
            g.add(pin)
        }
        return g
    }

    function crearPlug(w, h, color = 0x252830) {
        const g = new THREE.Group()
        g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.030),
            new THREE.MeshStandardMaterial({ color, metalness: 0.40, roughness: 0.60 })))
        const mazo = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.20, 0.012), cableMat)
        mazo.position.set(0, 0, 0.12); g.add(mazo)
        return g
    }

    const sockAtx = crearSocket(12, 2, 0.150, 0.055)
    sockAtx.position.copy(POS_ATX); G.add(sockAtx)
    const lAtx = crearTextoLabel('ATX 24-pin', 0.11)
    lAtx.position.set(POS_ATX.x, POS_ATX.y - 0.046, 0.014); G.add(lAtx)

    const sockEps = crearSocket(4, 2, 0.072, 0.055)
    sockEps.position.copy(POS_EPS); G.add(sockEps)
    const lEps = crearTextoLabel('EPS 8-pin', 0.09)
    lEps.position.set(POS_EPS.x, POS_EPS.y + 0.046, 0.014); G.add(lEps)

    const sockPcie = crearSocket(4, 2, 0.072, 0.055)
    sockPcie.position.copy(POS_PCIE); G.add(sockPcie)
    const lPcie = crearTextoLabel('PCIe 8-pin', 0.09)
    lPcie.position.set(POS_PCIE.x, POS_PCIE.y - 0.046, 0.014); G.add(lPcie)

    const plugAtx = crearPlug(0.150, 0.055)
    plugAtx.position.set(POS_ATX.x, POS_ATX.y, 0.22); plugAtx.visible = false
    G.add(plugAtx)

    const epsOpts = [
        { nombre: 'EPS CPU',    ok: true,  dx: -0.10, color: 0x1e2d44 },
        { nombre: 'PCIe 8-pin', ok: false, dx:  0.10, color: 0x2d1a1a }
    ]
    const epsGrupos = epsOpts.map(o => {
        const g = crearPlug(0.072, 0.055, o.color)
        const lbl = crearTextoLabel(o.nombre, 0.09); lbl.position.set(0, 0.050, 0); g.add(lbl)
        g.position.set(POS_EPS.x + o.dx, POS_EPS.y, 0.22)
        g.visible = false; G.add(g)
        return { group: g, ...o }
    })

    const plugPcie = crearPlug(0.072, 0.055, 0x1e2534)
    plugPcie.position.set(POS_PCIE.x, POS_PCIE.y, 0.22); plugPcie.visible = false
    G.add(plugPcie)

    function zoomSock(camOff, lookOff) {
        const ft = P.focusTarget.clone()
        enfocarCamara(ft.clone().add(camOff), ft.clone().add(lookOff), 0.55)
    }

    return [

        {
            titulo: 'Conectar ATX 24-pin a la placa',
            instruccion: 'El ATX 24-pin es el conector principal: suministra energía a toda la placa base. Encájalo en el socket del borde derecho.',
            activar(P) {
                zoomSock(
                    new THREE.Vector3(0.22, 0.06, 0.54),
                    new THREE.Vector3(0.18, 0.01, 0)
                )
                plugAtx.visible = true
                const desde   = new THREE.Vector3(POS_ATX.x, POS_ATX.y, 0.22)
                const destino = new THREE.Vector3(POS_ATX.x, POS_ATX.y, 0.008)
                const hs = crearHotspot(0x22c55e, 0.056)
                hs.position.set(POS_ATX.x, POS_ATX.y, 0.24)
                P.hotspot(hs, {
                    accion: 'ok',
                    alAcertar: done => tweenProc(v => plugAtx.position.lerpVectors(desde, destino, v), 0, 1, 580, done)
                })
            }
        },

        {
            titulo: 'Conectar EPS 8-pin al CPU',
            instruccion: 'Este cable alimenta los VRM del procesador. ¡Ojo! El EPS 8-pin y el PCIe 8-pin son físicamente idénticos. ¿Cuál va al CPU?',
            activar(P) {
                zoomSock(
                    new THREE.Vector3(-0.06, 0.20, 0.54),
                    new THREE.Vector3(-0.14, 0.13, 0)
                )
                epsGrupos.forEach(e => { e.group.visible = true })
                epsOpts.forEach((o, i) => {
                    const hs = crearHotspot(o.ok ? 0x3a8bff : 0xff7676, 0.032)
                    hs.position.set(POS_EPS.x + o.dx, POS_EPS.y, 0.24)
                    P.hotspot(hs, o.ok
                        ? {
                            accion: 'ok',
                            alAcertar: done => {
                                const desde   = epsGrupos[i].group.position.clone()
                                const destino = new THREE.Vector3(POS_EPS.x, POS_EPS.y, 0.008)
                                tweenProc(v => epsGrupos[i].group.position.lerpVectors(desde, destino, v), 0, 1, 520, done)
                            }
                          }
                        : {
                            accion: 'mal',
                            motivo: 'El PCIe 8-pin alimenta la GPU, no el CPU. Los conectores parecen idénticos, pero el cable de la fuente los distingue con la etiqueta "CPU" o "EPS". Conectarlo al revés puede dañar el equipo.'
                          })
                })
            }
        },

        {
            titulo: 'Conectar PCIe 8-pin a la GPU',
            instruccion: 'La RTX 3090 necesita alimentación directa de la fuente. Conecta el cable PCIe 8-pin al puerto de la tarjeta gráfica.',
            activar(P) {
                zoomSock(
                    new THREE.Vector3(0.14, -0.04, 0.54),
                    new THREE.Vector3(0.05, -0.09, 0)
                )
                plugPcie.visible = true
                const desde   = new THREE.Vector3(POS_PCIE.x, POS_PCIE.y, 0.22)
                const destino = new THREE.Vector3(POS_PCIE.x, POS_PCIE.y, 0.008)
                const hs = crearHotspot(0x22c55e, 0.036)
                hs.position.set(POS_PCIE.x, POS_PCIE.y, 0.24)
                P.hotspot(hs, {
                    accion: 'ok',
                    alAcertar: done => tweenProc(v => plugPcie.position.lerpVectors(desde, destino, v), 0, 1, 500, done)
                })
            }
        }
    ]
}

const SALA = { xMin: -5, xMax: 5, zMin: -4, zMax: 5, y0: -1.0, h: 3.6 }

function construirEntorno() {
    const grupo = new THREE.Group()
    crearSalaTaller(grupo)
    crearLucesTecho(grupo)
    crearBanco(grupo)
    crearTapete(grupo)
    crearPanelPegboard(grupo)
    crearEstanteria(grupo, SALA.xMin + 0.32, -1.6, Math.PI / 2)
    crearEstanteria(grupo, SALA.xMax - 0.32, -0.6, -Math.PI / 2)
    crearDecoracionPared(grupo)
    crearSombraContacto(grupo)
    crearProps(grupo)
    crearEstanteriaComponentes(grupo)
    scene.add(grupo)
}

function crearSalaTaller(grupo) {
    const { xMin, xMax, zMin, zMax, y0, h } = SALA
    const W = xMax - xMin, D = zMax - zMin
    const cx = (xMin + xMax) / 2, cz = (zMin + zMax) / 2
    const top = y0 + h

    const pisoTex = crearTexturaPisoModerno()
    pisoTex.repeat.set(W / 2.4, D / 2.4)
    const suelo = new THREE.Mesh(
        new THREE.PlaneGeometry(W, D),
        new THREE.MeshStandardMaterial({ map: pisoTex, roughness: 0.34, metalness: 0.12 })
    )
    suelo.rotation.x = -Math.PI / 2
    suelo.position.set(cx, y0, cz)
    suelo.receiveShadow = true
    grupo.add(suelo)

    const franja = new THREE.Mesh(
        new THREE.RingGeometry(2.52, 2.60, 64),
        new THREE.MeshStandardMaterial({
            color: 0x1cc9ff, emissive: 0x1cc9ff, emissiveIntensity: 0.9,
            roughness: 0.5, side: THREE.DoubleSide
        })
    )
    franja.rotation.x = -Math.PI / 2
    franja.position.set(0, y0 + 0.006, 0)
    grupo.add(franja)

    const techo = new THREE.Mesh(
        new THREE.PlaneGeometry(W, D),
        new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 1, metalness: 0 })
    )
    techo.rotation.x = Math.PI / 2
    techo.position.set(cx, top, cz)
    grupo.add(techo)

    crearPared(grupo, W, h, [cx, y0 + h / 2, zMin], 0)
    crearPared(grupo, W, h, [cx, y0 + h / 2, zMax], Math.PI)
    crearPared(grupo, D, h, [xMin, y0 + h / 2, cz], Math.PI / 2)
    crearPared(grupo, D, h, [xMax, y0 + h / 2, cz], -Math.PI / 2)
}

function crearPared(grupo, w, h, pos, rotY) {
    const tex = crearTexturaPared()
    tex.repeat.set(Math.max(1, Math.round(w / 4)), 1)
    const pared = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.96, metalness: 0, side: THREE.DoubleSide })
    )
    pared.position.set(pos[0], pos[1], pos[2])
    pared.rotation.y = rotY
    pared.receiveShadow = true
    grupo.add(pared)
}

function crearTexturaPared(size = 512) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')

    ctx.fillStyle = '#cabfa4'
    ctx.fillRect(0, 0, size, size)

    const wy = size * 0.66
    ctx.fillStyle = '#2f5d63'
    ctx.fillRect(0, wy, size, size - wy)

    ctx.fillStyle = '#5a4632'
    ctx.fillRect(0, wy - size * 0.02, size, size * 0.02)

    ctx.fillStyle = '#3a2f24'
    ctx.fillRect(0, size - size * 0.035, size, size * 0.035)

    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 2
    for (let x = 0; x <= size; x += size / 4) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, wy); ctx.stroke()
    }

    for (let i = 0; i < 1500; i++) {
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.04})`
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1)
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
}

function crearLucesTecho(grupo) {
    const top = SALA.y0 + SALA.h
    const marcoMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.6, roughness: 0.4 })
    const tuboMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 1.8 })
    ;[[-2, -1], [2, -1], [0, 2.2]].forEach(([x, z]) => {
        const marco = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.5), marcoMat)
        marco.position.set(x, top - 0.04, z); grupo.add(marco)
        const tubo = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.4), tuboMat)
        tubo.position.set(x, top - 0.07, z); grupo.add(tubo)
        const luz = new THREE.PointLight(0xfff3df, 5, 9, 2)
        luz.position.set(x, top - 0.25, z)
        grupo.add(luz)
    })
}

function crearEstanteria(grupo, x, z, rotY) {
    const g = new THREE.Group()
    const metal = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.6, roughness: 0.45 })
    const maderaMat = new THREE.MeshStandardMaterial({ map: crearTexturaMadera(), roughness: 0.7 })
    const W = 1.9, D = 0.5, H = 2.2, y0 = SALA.y0

    ;[[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]].forEach(([px, pz]) => {
        const poste = new THREE.Mesh(new THREE.BoxGeometry(0.06, H, 0.06), metal)
        poste.position.set(px, y0 + H / 2, pz); poste.castShadow = true; g.add(poste)
    })

    const colores = [0x2c79c7, 0x34c6a5, 0xe0a52e, 0xb23b34, 0x7c4dff, 0x26a69a]
    for (let i = 0; i < 4; i++) {
        const by = y0 + 0.1 + i * 0.62
        const balda = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, D), maderaMat)
        balda.position.set(0, by, 0); balda.castShadow = balda.receiveShadow = true; g.add(balda)

        const n = 2 + (i % 2)
        for (let k = 0; k < n; k++) {
            const cw = 0.3 + Math.random() * 0.25
            const ch = 0.18 + Math.random() * 0.18
            const caja = new THREE.Mesh(
                new THREE.BoxGeometry(cw, ch, 0.32),
                new THREE.MeshStandardMaterial({ color: colores[(i * 3 + k) % colores.length], roughness: 0.55, metalness: 0.1 })
            )
            caja.position.set(-W / 2 + 0.35 + k * 0.6, by + 0.02 + ch / 2, 0)
            caja.castShadow = true; g.add(caja)
        }
    }

    g.position.set(x, 0, z)
    g.rotation.y = rotY
    grupo.add(g)
}

function crearDecoracionPared(grupo) {
    const zBack = SALA.zMin + 0.06

    const poster = new THREE.Group()
    const marco = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.1, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.6 })
    )
    marco.castShadow = true; poster.add(marco)
    const lamina = new THREE.Mesh(
        new THREE.PlaneGeometry(1.36, 0.98),
        new THREE.MeshStandardMaterial({ map: crearTexturaBlueprint(), roughness: 0.5 })
    )
    lamina.position.z = 0.028; poster.add(lamina)
    poster.position.set(1.7, 1.15, zBack)
    grupo.add(poster)

    const reloj = new THREE.Group()
    const cuerpo = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.06, 40),
        new THREE.MeshStandardMaterial({ color: 0x23272e, metalness: 0.5, roughness: 0.4 })
    )
    cuerpo.rotation.x = Math.PI / 2; cuerpo.castShadow = true; reloj.add(cuerpo)
    const cara = new THREE.Mesh(
        new THREE.CircleGeometry(0.26, 40),
        new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.5 })
    )
    cara.position.z = 0.032; reloj.add(cara)
    const hMat = new THREE.MeshStandardMaterial({ color: 0x23272e })
    const hora = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.13, 0.012), hMat)
    hora.position.set(0, 0.05, 0.04); reloj.add(hora)
    const minuto = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.012), hMat)
    minuto.position.set(0.05, 0, 0.04); reloj.add(minuto)
    reloj.position.set(3.4, 1.9, zBack)
    grupo.add(reloj)

    const cartel = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 0.55),
        new THREE.MeshStandardMaterial({ map: crearTexturaCartel(), emissive: 0xffffff, emissiveMap: crearTexturaCartel(), emissiveIntensity: 0.6, roughness: 0.6 })
    )
    cartel.position.set(-1.4, 2.25, zBack)
    grupo.add(cartel)
}

function crearTexturaCartel(size = 512) {
    const c = document.createElement('canvas')
    c.width = size; c.height = Math.round(size * 0.21)
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#0f1b2e'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#2c79c7'; ctx.lineWidth = 6
    ctx.strokeRect(6, 6, c.width - 12, c.height - 12)
    ctx.fillStyle = '#eaf2ff'
    ctx.font = `bold ${c.height * 0.5}px 'Segoe UI', sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('LOGICFLOW · TALLER', c.width / 2, c.height / 2)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
}

function crearHabitacion(grupo) {
    const muroMat = new THREE.MeshStandardMaterial({
        color: 0xb8c3cf, roughness: 0.97, metalness: 0, side: THREE.DoubleSide
    })
    const Y0 = -1.15, H = 4.8, cy = Y0 + H / 2

    const trasera = new THREE.Mesh(new THREE.PlaneGeometry(14, H), muroMat)
    trasera.position.set(0, cy, -2.5); trasera.receiveShadow = true; grupo.add(trasera)

    const izq = new THREE.Mesh(new THREE.PlaneGeometry(12, H), muroMat)
    izq.rotation.y = Math.PI / 2
    izq.position.set(-4.3, cy, -0.5); izq.receiveShadow = true; grupo.add(izq)

    const der = new THREE.Mesh(new THREE.PlaneGeometry(12, H), muroMat)
    der.rotation.y = -Math.PI / 2
    der.position.set(4.3, cy, -0.5); der.receiveShadow = true; grupo.add(der)

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x39322a, roughness: 0.7 })
    const rbT = new THREE.Mesh(new THREE.BoxGeometry(14, 0.16, 0.04), baseMat)
    rbT.position.set(0, Y0 + 0.08, -2.46); grupo.add(rbT)
    const rbI = new THREE.Mesh(new THREE.BoxGeometry(12, 0.16, 0.04), baseMat)
    rbI.rotation.y = Math.PI / 2; rbI.position.set(-4.26, Y0 + 0.08, -0.5); grupo.add(rbI)
    const rbD = rbI.clone(); rbD.position.x = 4.26; grupo.add(rbD)

    grupo.add(crearPoster())
    grupo.add(crearReloj())
}

function crearPoster() {
    const g = new THREE.Group()
    const marco = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 1.25, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.6 })
    )
    marco.castShadow = true; g.add(marco)
    const lamina = new THREE.Mesh(
        new THREE.PlaneGeometry(1.42, 1.06),
        new THREE.MeshStandardMaterial({ map: crearTexturaBlueprint(), roughness: 0.5 })
    )
    lamina.rotation.y = Math.PI / 2
    lamina.position.x = 0.028
    g.add(lamina)
    g.position.set(-4.26, 0.75, -0.8)
    return g
}

function crearReloj() {
    const g = new THREE.Group()
    const cuerpo = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.05, 40),
        new THREE.MeshStandardMaterial({ color: 0x23272e, metalness: 0.5, roughness: 0.4 })
    )
    cuerpo.rotation.z = Math.PI / 2; cuerpo.castShadow = true; g.add(cuerpo)
    const cara = new THREE.Mesh(
        new THREE.CircleGeometry(0.26, 40),
        new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.5 })
    )
    cara.rotation.y = -Math.PI / 2; cara.position.x = -0.026; g.add(cara)
    const hMat = new THREE.MeshStandardMaterial({ color: 0x23272e })
    const hora = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.13, 0.018), hMat)
    hora.position.set(-0.032, 0.05, 0); g.add(hora)
    const minuto = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.18), hMat)
    minuto.position.set(-0.032, 0, 0.06); g.add(minuto)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 16), hMat)
    hub.rotation.z = Math.PI / 2; hub.position.x = -0.034; g.add(hub)
    g.position.set(4.27, 0.95, -0.6)
    return g
}

function crearTexturaBlueprint(size = 512) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#1f4e8a'; ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1
    for (let i = 0; i <= size; i += size / 24) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2
    ctx.strokeRect(size * 0.16, size * 0.22, size * 0.52, size * 0.44)
    ctx.strokeRect(size * 0.22, size * 0.28, size * 0.12, size * 0.12)
    ;[0.46, 0.5, 0.54, 0.58].forEach(x => ctx.strokeRect(size * x, size * 0.28, size * 0.025, size * 0.3))
    ctx.beginPath(); ctx.arc(size * 0.3, size * 0.56, size * 0.04, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeRect(size * 0.62, size * 0.78, size * 0.3, size * 0.14)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `bold ${size * 0.035}px monospace`
    ctx.fillText('ATX MAINBOARD', size * 0.16, size * 0.17)
    ctx.font = `${size * 0.026}px monospace`
    ctx.fillText('REV 1.0 — LOGICFLOW', size * 0.635, size * 0.865)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
}

function crearPisoConcreto(grupo) {

    const alpha = crearTexturaRadial([
        [0.0, 'rgba(255,255,255,1)'],
        [0.62, 'rgba(255,255,255,1)'],
        [1.0, 'rgba(255,255,255,0)']
    ])
    const piso = new THREE.Mesh(
        new THREE.CircleGeometry(6.5, 96),
        new THREE.MeshStandardMaterial({
            map: crearTexturaConcreto(), alphaMap: alpha, transparent: true,
            roughness: 0.92, metalness: 0.0, color: 0x8c867d
        })
    )
    piso.rotation.x = -Math.PI / 2
    piso.position.y = -1.0
    piso.receiveShadow = true
    grupo.add(piso)
}

function crearPanelPegboard(grupo) {
    const g = new THREE.Group()
    const marcoMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.6, roughness: 0.4 })

    const panel = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 1.5, 0.06),
        new THREE.MeshStandardMaterial({ map: crearTexturaPegboard(), roughness: 0.82, metalness: 0.05 })
    )
    panel.position.y = 1.0
    panel.castShadow = panel.receiveShadow = true
    g.add(panel)

    const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.07, 0.09), marcoMat)
    top.position.set(0, 1.77, 0); g.add(top)
    const bot = top.clone(); bot.position.y = 0.23; g.add(bot)
    const lft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.6, 0.09), marcoMat)
    lft.position.set(-1.28, 1.0, 0); g.add(lft)
    const rgt = lft.clone(); rgt.position.x = 1.28; g.add(rgt)

    g.add(crearHerramientasColgadas())

    g.position.set(-1.4, 0, SALA.zMin + 0.07)
    grupo.add(g)
}

function crearHerramientasColgadas() {
    const g = new THREE.Group()
    const metal = new THREE.MeshStandardMaterial({ color: 0xb9c0c8, metalness: 0.85, roughness: 0.28 })
    const azul  = new THREE.MeshStandardMaterial({ color: 0x21466e, roughness: 0.5 })
    const ambar = new THREE.MeshStandardMaterial({ color: 0xe0a52e, roughness: 0.5 })

    const llave = new THREE.Group()
    llave.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.02), metal))
    const cabeza = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 10, 22, Math.PI * 1.4), metal)
    cabeza.position.y = 0.27; llave.add(cabeza)
    llave.position.set(-0.8, 1.05, 0.06); g.add(llave)

    const mart = new THREE.Group()
    mart.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 12), azul))
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.06), metal)
    cab.position.y = 0.2; mart.add(cab)
    mart.position.set(0.78, 1.02, 0.06); g.add(mart)

    const dest = new THREE.Group()
    dest.add(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.17, 16), ambar))
    const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 12), metal)
    eje.position.y = -0.17; dest.add(eje)
    dest.position.set(0.12, 1.05, 0.06); g.add(dest)

    const ali = new THREE.Group()
    ali.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.02), metal))
    const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.02), azul)
    m1.position.set(-0.02, -0.22, 0); m1.rotation.z = 0.18; ali.add(m1)
    const m2 = m1.clone(); m2.position.x = 0.02; m2.rotation.z = -0.18; ali.add(m2)
    ali.position.set(-0.4, 1.0, 0.06); g.add(ali)

    g.traverse(o => { if (o.isMesh) o.castShadow = true })
    return g
}

function crearBanco(grupo) {

    const fallback = construirBancoProcedural()
    grupo.add(fallback)

    new GLTFLoader().load(
        'assets/3d_models/computer_desk/scene.gltf',
        (gltf) => {
            const desk = gltf.scene

            let box = new THREE.Box3().setFromObject(desk)
            const dim = box.getSize(new THREE.Vector3())
            const s = 3.6 / (Math.max(dim.x, dim.z) || 1)
            desk.scale.setScalar(s)
            box = new THREE.Box3().setFromObject(desk)
            const c = box.getCenter(new THREE.Vector3())
            desk.position.x -= c.x
            desk.position.z -= c.z - 0.12
            desk.position.y -= box.max.y
            desk.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true } })
            grupo.remove(fallback)
            grupo.add(desk)
            modelos3D._desk = desk
            appendLog('Escritorio 3D cargado.', 'success')
        },
        undefined,
        () => appendLog('Escritorio no disponible; se usa banco básico.', 'system')
    )
}

function construirBancoProcedural() {
    const g = new THREE.Group()
    const top = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 0.14, 2.3),
        new THREE.MeshStandardMaterial({ map: crearTexturaMadera(), roughness: 0.55, metalness: 0.04 })
    )
    top.position.set(0, -0.075, -0.15)
    top.castShadow = top.receiveShadow = true
    g.add(top)

    const metal = new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.75, roughness: 0.4 })
    ;[[-2.1, -0.9], [2.1, -0.9], [-2.1, 0.6], [2.1, 0.6]].forEach(([x, z]) => {
        const pata = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.0, 0.09), metal)
        pata.position.set(x, -0.64, z); pata.castShadow = true; g.add(pata)
    })
    const tLat1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.5), metal)
    tLat1.position.set(-2.1, -1.0, -0.15); g.add(tLat1)
    const tLat2 = tLat1.clone(); tLat2.position.x = 2.1; g.add(tLat2)
    const tBack = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 0.06), metal)
    tBack.position.set(0, -1.0, 0.6); g.add(tBack)
    return g
}

function crearTapete(grupo) {
    const tapete = new THREE.Mesh(
        new THREE.PlaneGeometry(2.3, 1.8),
        new THREE.MeshStandardMaterial({ map: crearTexturaMat(), roughness: 0.9, metalness: 0.05 })
    )
    tapete.rotation.x = -Math.PI / 2
    tapete.position.set(0, -0.002, 0)
    tapete.receiveShadow = true
    grupo.add(tapete)
}

function crearSombraContacto(grupo) {
    const sombraTex = crearTexturaRadial([
        [0.0,  'rgba(8,20,30,0.55)'],
        [0.45, 'rgba(8,20,30,0.30)'],
        [0.75, 'rgba(8,20,30,0.08)'],
        [1.0,  'rgba(8,20,30,0.0)']
    ])
    const sombra = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 1.8),
        new THREE.MeshBasicMaterial({ map: sombraTex, transparent: true, depthWrite: false })
    )
    sombra.rotation.x = -Math.PI / 2
    sombra.position.y = 0.004
    sombra.renderOrder = 1
    grupo.add(sombra)
}

function crearProps(grupo) {
    grupo.add(crearLampara())
    grupo.add(crearCajaHerramientas())
    grupo.add(crearDestornillador())
    grupo.add(crearTaza())
    grupo.add(crearBobinaCable())
}

function meshEntre(p1, p2, radio, mat) {
    const dir = new THREE.Vector3().subVectors(p2, p1)
    const len = dir.length()
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, len, 18), mat)
    m.position.copy(p1).lerp(p2, 0.5)
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    m.castShadow = true
    return m
}

function crearLampara() {
    const g = new THREE.Group()
    const metalOsc = new THREE.MeshStandardMaterial({ color: 0x23272e, metalness: 0.7, roughness: 0.35 })

    const pBase   = new THREE.Vector3(0,    0.05, 0)
    const pCodo   = new THREE.Vector3(0,    0.62, 0)
    const pMuneca = new THREE.Vector3(0.5,  0.86, 0)
    const pFoco   = new THREE.Vector3(0.66, 0.60, 0)

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.045, 36), metalOsc)
    base.position.y = 0.022; base.castShadow = true; g.add(base)
    const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.06, 24), metalOsc)
    cuello.position.y = 0.07; g.add(cuello)

    g.add(meshEntre(pBase, pCodo, 0.02, metalOsc))
    g.add(meshEntre(pCodo, pMuneca, 0.018, metalOsc))
    ;[pCodo, pMuneca].forEach(p => {
        const j = new THREE.Mesh(new THREE.SphereGeometry(0.034, 18, 18), metalOsc)
        j.position.copy(p); g.add(j)
    })

    const eje = new THREE.Vector3().subVectors(pFoco, pMuneca)
    const pantalla = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, eje.length() * 1.3, 30, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x2c79c7, metalness: 0.45, roughness: 0.4, side: THREE.DoubleSide })
    )
    pantalla.position.copy(pMuneca).lerp(pFoco, 0.5)
    pantalla.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), eje.clone().normalize())
    pantalla.castShadow = true
    g.add(pantalla)

    const foco = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xfff3da, emissive: 0xffd98a, emissiveIntensity: 2.4 })
    )
    foco.position.copy(pFoco); g.add(foco)

    const luz = new THREE.PointLight(0xffca70, 8, 4.5, 2)
    luz.position.copy(pFoco).add(new THREE.Vector3(0.04, -0.06, 0))
    g.add(luz)

    g.position.set(-1.5, 0, -0.5)
    g.rotation.y = Math.PI / 4.5
    return g
}

function crearCajaHerramientas() {
    const g = new THREE.Group()
    const rojo = new THREE.MeshStandardMaterial({ color: 0xb23b34, metalness: 0.4, roughness: 0.45 })
    const gris = new THREE.MeshStandardMaterial({ color: 0x33373d, metalness: 0.6, roughness: 0.4 })

    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.26, 0.34), rojo)
    cuerpo.position.y = 0.13; cuerpo.castShadow = true; g.add(cuerpo)

    const tapa = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.36), rojo)
    tapa.position.y = 0.3; tapa.castShadow = true; g.add(tapa)

    const manija = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 12, 24, Math.PI), gris)
    manija.position.set(0, 0.36, 0); g.add(manija)

    const cierre = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), gris)
    cierre.position.set(0.2, 0.22, 0.18); g.add(cierre)

    g.position.set(1.5, 0, -0.5)
    g.rotation.y = -Math.PI / 7
    return g
}

function crearDestornillador() {
    const g = new THREE.Group()
    const mango = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.03, 0.18, 20),
        new THREE.MeshStandardMaterial({ color: 0xe0a52e, metalness: 0.2, roughness: 0.5 })
    )
    const eje = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.22, 16),
        new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 0.85, roughness: 0.25 })
    )
    eje.position.y = 0.2
    mango.add(eje)
    g.add(mango)
    g.rotation.z = Math.PI / 2
    g.rotation.y = Math.PI / 6
    g.position.set(0.62, 0.04, 0.62)
    g.traverse(o => { if (o.isMesh) o.castShadow = true })
    return g
}

function crearTaza() {
    const g = new THREE.Group()
    const blanco = new THREE.MeshStandardMaterial({ color: 0xeef1f4, metalness: 0.05, roughness: 0.4 })
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.16, 28), blanco)
    cuerpo.position.y = 0.08; cuerpo.castShadow = true; g.add(cuerpo)
    const cafe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.082, 0.082, 0.01, 28),
        new THREE.MeshStandardMaterial({ color: 0x3a2317, roughness: 0.3 })
    )
    cafe.position.y = 0.155; g.add(cafe)
    const asa = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 12, 24), blanco)
    asa.position.set(0.095, 0.08, 0); asa.rotation.y = Math.PI / 2; g.add(asa)
    g.position.set(1.15, 0, 0.7)
    return g
}

function crearBobinaCable() {
    const g = new THREE.Group()
    const negro = new THREE.MeshStandardMaterial({ color: 0x1a1d22, metalness: 0.2, roughness: 0.6 })
    for (let i = 0; i < 3; i++) {
        const aro = new THREE.Mesh(new THREE.TorusGeometry(0.13 - i * 0.018, 0.022, 14, 36), negro)
        aro.rotation.x = Math.PI / 2
        aro.position.y = 0.022 + i * 0.005
        aro.castShadow = true
        g.add(aro)
    }
    g.position.set(-1.0, 0.0, 0.68)
    return g
}

function construirIluminacion() {

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))

    scene.add(new THREE.HemisphereLight(0xfff1d8, 0x6f6a63, 0.55))

    const key = new THREE.DirectionalLight(0xfff4e2, 1.7)
    key.position.set(2.5, 5, 3)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 14
    key.shadow.camera.left = -3; key.shadow.camera.right = 3
    key.shadow.camera.top = 3;   key.shadow.camera.bottom = -3
    key.shadow.bias = -0.0004
    scene.add(key)

    const fill = new THREE.DirectionalLight(0xcfe0f5, 0.5)
    fill.position.set(-3, 2.5, 2)
    scene.add(fill)
}

function crearMarcadores() {
    PASOS.forEach(paso => {
        const grupo = new THREE.Group()
        grupo.position.copy(paso.pos)
        const radio = Math.max(0.12, paso.size * 0.34)

        const disco = new THREE.Mesh(
            new THREE.CircleGeometry(radio, 48),
            new THREE.MeshBasicMaterial({ color: paso.color, transparent: true, opacity: 0.30, side: THREE.DoubleSide, depthWrite: false, depthTest: false })
        )
        disco.userData = { id: paso.id }
        disco.renderOrder = 998
        grupo.add(disco)
        slotDiscs.push(disco)

        const anillo = new THREE.Mesh(
            new THREE.RingGeometry(radio * 0.9, radio, 48),
            new THREE.MeshBasicMaterial({ color: paso.color, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false, depthTest: false })
        )
        anillo.renderOrder = 999
        grupo.add(anillo)

        const flecha = new THREE.Mesh(
            new THREE.ConeGeometry(radio * 0.3, radio * 0.55, 4),
            new THREE.MeshBasicMaterial({ color: paso.color, depthTest: false })
        )
        flecha.rotation.z = Math.PI
        flecha.position.y = radio * 1.7
        flecha.renderOrder = 999
        grupo.add(flecha)

        grupo.visible = false
        grupo.userData = { flecha, anillo, baseFlechaY: radio * 1.7 }
        scene.add(grupo)
        paso.marker = grupo
    })
}

function activarMarcador(idx, intenso = false) {
    PASOS.forEach((p, i) => { if (p.marker) p.marker.visible = false })
    const paso = PASOS[idx]
    if (paso?.marker) {
        paso.marker.visible = true
        paso.marker.userData.intenso = intenso
    }
}

function ocultarMarcador(id) {
    const paso = PASOS.find(p => p.id === id)
    if (paso?.marker) paso.marker.visible = false
}

// Máxima resolución de textura permitida. Los modelos traen PNG de varios MB
// (hasta 4K+) que son enormes para piezas que se ven pequeñas en pantalla.
// Reescalarlas reduce drásticamente la memoria de GPU y los tirones al subirlas.
const MAX_TEX_SIZE = 1024
let _maxAniso = 4

// Reduce una textura a MAX_TEX_SIZE como máximo y ajusta filtrado/anisotropía.
function optimizarTextura(tex) {
    if (!tex || !tex.image || tex.userData?.optimizada) return
    const img = tex.image
    const iw = img.width || img.videoWidth || 0
    const ih = img.height || img.videoHeight || 0
    if (iw > MAX_TEX_SIZE || ih > MAX_TEX_SIZE) {
        const escala = MAX_TEX_SIZE / Math.max(iw, ih)
        const c = document.createElement('canvas')
        c.width  = Math.max(1, Math.round(iw * escala))
        c.height = Math.max(1, Math.round(ih * escala))
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0, c.width, c.height)
        tex.image = c
        tex.needsUpdate = true
    }
    tex.anisotropy = _maxAniso
    tex.generateMipmaps = true
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.userData = tex.userData || {}
    tex.userData.optimizada = true
}

function optimizarMateriales(obj) {
    const claves = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']
    obj.traverse(n => {
        if (!n.isMesh) return
        n.castShadow = true
        n.receiveShadow = true
        const mats = Array.isArray(n.material) ? n.material : [n.material]
        mats.forEach(m => { if (m) claves.forEach(k => optimizarTextura(m[k])) })
    })
}

function precargarModelos() {
    const loader = new GLTFLoader()
    appendLog('Cargando modelos 3D de hardware…', 'system')

    if (renderer) _maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy())

    let cargados = 0
    const total = PASOS.length
    setLoadingProgress(0, total)

    const safety = setTimeout(ocultarLoading, 30000)
    const marcarCargado = () => {
        cargados++
        setLoadingProgress(cargados, total)
        pedirActualizarSombras()
        if (cargados >= total) { clearTimeout(safety); ocultarLoading() }
    }

    // Carga secuencial: subir las texturas pesadas de una en una evita el gran
    // congelamiento que produce decodificar/subir 8 modelos a la vez.
    let idx = 0
    const siguiente = () => {
        if (idx >= PASOS.length) return
        const paso = PASOS[idx++]
        loader.load(
            paso.ruta,
            (gltf) => {
                const obj = normalizar(gltf.scene, paso.size)
                optimizarMateriales(obj)
                const grupo = new THREE.Group()
                grupo.add(obj)
                const r = paso.rot || { x: 0, y: 0, z: 0 }
                grupo.rotation.set(r.x || 0, r.y || 0, r.z || 0)
                grupo.position.copy(paso.pos)
                grupo.visible = false
                scene.add(grupo)
                modelos3D[paso.id] = grupo

                actualizarSlotEstante(paso, obj)
                appendLog(`Modelo listo: ${paso.nombre}`, 'success')
                if (PASOS.indexOf(paso) < indiceActual) colocarModelo(paso, false)
                marcarCargado()
                siguiente()
            },
            undefined,
            () => {

                const ph = crearPlaceholder(paso)
                ph.visible = false
                scene.add(ph)
                modelos3D[paso.id] = ph
                appendLog(`Usando representación básica de ${paso.nombre}.`, 'system')
                if (PASOS.indexOf(paso) < indiceActual) colocarModelo(paso, false)
                marcarCargado()
                siguiente()
            }
        )
    }
    siguiente()
}

function normalizar(obj, size) {
    let box = new THREE.Box3().setFromObject(obj)
    const dim = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(dim.x, dim.y, dim.z) || 1
    obj.scale.setScalar(size / maxDim)
    box = new THREE.Box3().setFromObject(obj)
    const center = box.getCenter(new THREE.Vector3())
    obj.position.sub(center)
    return obj
}

function crearPlaceholder(paso) {
    const grupo = new THREE.Group()
    const geo = new THREE.BoxGeometry(paso.size, paso.size * 0.3, paso.size * 0.8)
    const mat = new THREE.MeshStandardMaterial({
        color: paso.color, metalness: 0.6, roughness: 0.35,
        emissive: paso.color, emissiveIntensity: 0.12
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    grupo.add(mesh)
    grupo.position.copy(paso.pos)
    return grupo
}

function colocarModelo(paso, conAnimacion) {
    const m = modelos3D[paso.id]
    if (!m) return
    m.visible = true
    const targetY = paso.pos.y
    if (conAnimacion) {
        m.position.set(paso.pos.x, targetY + 0.7, paso.pos.z)
        animacionesCaida.push({ obj: m, targetY })
    } else {
        m.position.set(paso.pos.x, targetY, paso.pos.z)
    }
    pedirActualizarSombras()
}

function animar() {
    requestAnimationFrame(animar)
    const t = performance.now() * 0.003
    const delta = relojWalk.getDelta()

    PASOS.forEach(p => {
        if (p.marker && p.marker.visible) {
            if (camera) p.marker.quaternion.copy(camera.quaternion)
            const intenso = p.marker.userData.intenso
            const pulso = 1 + Math.sin(t * 2) * (intenso ? 0.18 : 0.10)
            p.marker.scale.setScalar(pulso)
            const { flecha, anillo, baseFlechaY } = p.marker.userData
            if (flecha) flecha.position.y = baseFlechaY + Math.sin(t * 2.5) * baseFlechaY * 0.18
            if (anillo) anillo.material.opacity = intenso ? 1 : 0.7 + Math.sin(t * 2) * 0.25
        }
    })

    if (animacionesCaida.length) {
        for (let i = animacionesCaida.length - 1; i >= 0; i--) {
            const a = animacionesCaida[i]
            a.obj.position.y += (a.targetY - a.obj.position.y) * 0.14
            if (Math.abs(a.targetY - a.obj.position.y) < 0.003) {
                a.obj.position.y = a.targetY
                animacionesCaida.splice(i, 1)
            }
        }
        // Los modelos en caída proyectan sombra: refrescarla mientras se animan.
        pedirActualizarSombras()
    }

    if (walkMode) actualizarCaminar(delta)
    else if (controls?.enabled) controls.update()

    if (camTween) {
        camTween.t += delta / camTween.dur
        const k = Math.min(1, camTween.t)
        const e = k * k * (3 - 2 * k)
        camera.position.lerpVectors(camTween.fromPos, camTween.toPos, e)
        camera.lookAt(_scrLook.lerpVectors(camTween.fromLook, camTween.toLook, e))
        if (k >= 1) { const cb = camTween.onDone; camTween = null; if (cb) cb() }
    } else if (procActivo) {
        camera.lookAt(procActivo.focusTarget)
        const pulso = 0.5 + 0.45 * (0.5 + 0.5 * Math.sin(t * 4))
        procActivo.hotspots.forEach(h => {
            if (h.userData.pulse === false) return
            const ring = h.userData.ring
            if (ring && ring.material) ring.material.opacity = pulso
        })
    }

    if (heldMesh && walkMode && camera) {
        camera.getWorldDirection(_scrFwd)
        _scrRight.crossVectors(_scrFwd, _UP).normalize()
        heldMesh.position.copy(camera.position)
            .addScaledVector(_scrFwd,   0.50)
            .addScaledVector(_scrRight, 0.24)
        heldMesh.position.y += -0.19 + Math.sin(t * 2.8) * 0.007
        heldMesh.rotation.set(camera.rotation.x + 0.18, camera.rotation.y, camera.rotation.z)
    }

    frameCount++
    if (walkMode && walkControls?.isLocked && frameCount % 12 === 0) {
        _crosshairRay.setFromCamera(_CENTER, camera)
        _crosshairRay.far = 3.2
        const targets = heldComponent ? slotDiscs : shelfMeshes
        const hit = _crosshairRay.intersectObjects(targets).length > 0
        const ch = document.getElementById('crosshair')
        if (ch) ch.style.color = hit ? '#4ade80' : 'rgba(255,255,255,0.75)'
    }

    renderer?.render(scene, camera)
}

function resizeRenderer() {
    if (!renderer || !camera || !canvas) return
    const w = canvas.parentElement.clientWidth
    const h = canvas.parentElement.clientHeight
    if (!w || !h) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
}

const LS_KEY = 'lf_instalados'

function leerProgresoLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function guardarProgresoLocal(id) {
    const arr = leerProgresoLocal()
    if (!arr.includes(id)) { arr.push(id); localStorage.setItem(LS_KEY, JSON.stringify(arr)) }
}

function limpiarProgresoLocal() {
    localStorage.removeItem(LS_KEY)
}

const LS_STATS_KEY = 'lf_stats'

function guardarStatsLocal() {
    localStorage.setItem(LS_STATS_KEY, JSON.stringify({
        errores: erroresSesion,
        demoras: demorasSesion,
        tiempoMs: Date.now() - labStartTime
    }))
}

function leerStatsLocal() {
    try { return JSON.parse(localStorage.getItem(LS_STATS_KEY) || 'null') } catch { return null }
}

function limpiarStatsLocal() {
    localStorage.removeItem(LS_STATS_KEY)
}

async function initGame() {

    let instalados = leerProgresoLocal()

    if (instalados.length === 0) {
        const progreso = await obtenerProgreso()
        if (progreso) instalados = progreso.componentes_instalados || []
    }

    if (instalados.length >= TOTAL) {

        const savedStats = leerStatsLocal()
        indiceActual     = TOTAL
        sessionStartTime = Date.now()
        labStartTime     = savedStats ? Date.now() - savedStats.tiempoMs : Date.now()
        erroresSesion    = savedStats?.errores ?? 0
        demorasSesion    = savedStats?.demoras ?? 0
        renderChecklist()
        initMotor3D()
        motorListo = true
        mostrarFinal()
        return
    }

    indiceActual = Math.min(instalados.length, TOTAL)
    sessionStartTime = Date.now()
    labStartTime = Date.now()
    erroresSesion = 0
    demorasSesion = 0

    renderChecklist()
    initMotor3D()
    motorListo = true

    if (indiceActual === 0) {
        mostrarBienvenida()
    } else {
        appendLog(`Progreso restaurado. Continúa en el paso ${indiceActual + 1}.`, 'info')
        mostrarFase3D(indiceActual)
    }
}

document.getElementById('btn-empezar')?.addEventListener('click', () => mostrarVideo(indiceActual))
document.getElementById('btn-ir-3d')?.addEventListener('click', () => mostrarFase3D(indiceActual))
document.getElementById('btn-skip-video')?.addEventListener('click', () => mostrarFase3D(indiceActual))

document.getElementById('component-list')?.addEventListener('click', e => {
    const btn = e.target.closest('button')
    if (!btn || btn.disabled) return
    handleSelection(btn.getAttribute('data-component'))
})

document.getElementById('checklist-ul')?.addEventListener('click', e => {
    const li = e.target.closest('li[data-idx]')
    if (!li) return
    const idx = parseInt(li.dataset.idx)
    if (idx < indiceActual) retrocederA(idx)
})

window.addEventListener('resize', resizeRenderer)

setInterval(() => {
    if (fase !== '3d') return
    const el = document.getElementById('lab-timer')
    if (el) el.textContent = formatTiempo(Math.round((Date.now() - labStartTime) / 1000))
}, 1000)

document.getElementById('walk-start-btn')?.addEventListener('click', () => {
    const card = document.getElementById('walk-start')
    if (card) card.style.display = 'none'
    entrarCaminar()
})

window.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp':    if (walkMode) teclas.w = true; break
        case 'KeyS': case 'ArrowDown':  if (walkMode) teclas.s = true; break
        case 'KeyA': case 'ArrowLeft':  if (walkMode) teclas.a = true; break
        case 'KeyD': case 'ArrowRight': if (walkMode) teclas.d = true; break
        case 'ShiftLeft': case 'ShiftRight': if (walkMode) teclas.shift = true; break
        case 'KeyE': interactuarE(); break
        case 'KeyQ': if (walkMode && heldComponent) soltarComponente(); break
        case 'Escape': if (procActivo) { e.preventDefault(); cancelarProcedimiento() } break
    }
})

window.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp':    teclas.w = false; break
        case 'KeyS': case 'ArrowDown':  teclas.s = false; break
        case 'KeyA': case 'ArrowLeft':  teclas.a = false; break
        case 'KeyD': case 'ArrowRight': teclas.d = false; break
        case 'ShiftLeft': case 'ShiftRight': teclas.shift = false; break
    }
})

document.addEventListener('DOMContentLoaded', async () => {
    const session = await protegerRuta()
    if (!session) return
    initGame()
})
