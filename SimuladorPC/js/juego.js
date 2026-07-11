import { protegerRuta } from './auth.js'
import { academiaAprobada, sincronizar as sincronizarAcademia } from './academia-api.js'
import { STORAGE_KEYS, authStore } from './supabase-config.js'
import { obtenerProgreso, guardarProgreso, reiniciarProgreso, registrarEvento, marcarAprobacionWeb, subirFotoSimulador, guardarComprension, marcarPruebaArranque } from './progreso.js'
import { PROC_LOGRO, notaConBono } from './achievements.js'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { obtenerReto, calcularNotaReto, LOGROS_RETO, NOTA_MINIMA_RETO } from './retos-data.js'
import { guardarResultadoReto, obtenerResultadosRetos, otorgarLogros, obtenerLogrosUsuario } from './retos-api.js'
import * as LFSound from './audio.js'
import { EVALUACION, elegirPreguntaComponente, notaConceptual, combinarNota, gananciaAprendizaje, notaDestreza } from './quiz-data.js'

import { PASOS } from './pasos-data.js'
import { crearTexturaRadial, crearTexturaMadera, crearTexturaMaderaClara, crearTexturaLetreroComponentes, crearTexturaPisoModerno, crearTexturaPegboard, crearTexturaMat, crearTexturaEtiqueta, crearTexturaPared, crearTexturaCielo, crearTexturaCartel, crearTexturaBlueprint } from './texturas.js'
import { crearLampara, crearCajaHerramientas, crearDestornillador, crearTaza, crearBobinaCable } from './juego-props.js'
import { tweenProc, crearHotspot, crearNumeroLabel, crearTextoLabel, crearTrianguloProc, ponerTornillo, conectarCable } from './juego-proc-helpers.js'
import { construirProcedimientoCPU, construirProcedimientoMB, construirProcedimientoCooler, construirProcedimientoRAM, construirProcedimientoGPU, construirProcedimientoPSU } from './juego-procedimientos.js'

const TOTAL = PASOS.length

// Los modelos se sirven comprimidos con Draco (.opt.glb). Se necesita un
// DRACOLoader con el decodificador WASM local para poder leerlos. Reutilizamos
// una única instancia entre todos los GLTFLoader.
let _dracoLoader = null
function crearGLTFLoader() {
    if (!_dracoLoader) {
        _dracoLoader = new DRACOLoader()
        _dracoLoader.setDecoderPath('/vendor/three/addons/libs/draco/gltf/')
    }
    const loader = new GLTFLoader()
    loader.setDRACOLoader(_dracoLoader)
    return loader
}

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
// Evita que un doble clic o una tecla E mantenida presionada (key-repeat) reentren en
// finalizarPaso() mientras el guardado async del paso anterior sigue en vuelo, lo que
// saltaría un componente completo (indiceActual++ se dispararía más de una vez).
let instalandoPaso = false
let sessionStartTime = Date.now()
let labStartTime = Date.now()
let erroresSesion = 0
let demorasSesion = 0
let aciertosConceptuales = 0   // preguntas de comprensión acertadas al primer intento
let preguntasRespondidas = 0   // total de preguntas de comprensión mostradas
let preTestAciertos = null     // aciertos en el test diagnóstico (null = no realizado)
let postTestAciertos = null    // aciertos en el test final
let preTestHecho = false       // evita repetir el diagnóstico al reentrar

let scene, camera, renderer, controls, raycaster, mouse
let slotDiscs = []
let modelos3D = {}
const animacionesCaida = []
let motorListo = false

// Ambiente del taller (fase de rediseño): mixers de animación (fans, monitor…),
// props reales cargados por id (para calibración por consola) y un cargador de
// texturas PBR compartido para piso/paredes.
const mixers = []
const propsTaller = {}
const _texLoader = new THREE.TextureLoader()

// SSD desarmable (teardown de la Fase 2A). El clip original targetea huesos
// "Bone.001_SSD" que GLTFLoader renombra sin punto → no bindea. Como las 4 capas
// son mallas normales accesibles por nombre, animamos su despiece a mano:
// ssdPartes = [{ nodo, rest, dir }]; ssdProg va de 0 (armado) a 1 (desarmado).
let ssdPartes = null, ssdProg = 0, ssdTarget = 0

const ES_TACTIL = window.matchMedia('(pointer: coarse)').matches || !window.matchMedia('(pointer: fine)').matches

// Heurística de equipo modesto (pocos núcleos y/o poca RAM reportada, o táctil):
// baja antialiasing/resolución/sombras para evitar bajones de FPS en esas PCs.
const EQUIPO_MODESTO = ES_TACTIL
    || (navigator.hardwareConcurrency || 8) <= 4
    || (navigator.deviceMemory || 8) <= 4

// Tope por modelo en precargarModelos(): ver comentario junto a su uso.
const MODEL_LOAD_TIMEOUT_MS = 20000

let walkControls = null
let walkMode = false
let distCaminata = 0
const teclas = { w: false, a: false, s: false, d: false, shift: false }
const relojWalk = new THREE.Clock()
const ALTURA_OJOS = 2.3
const RADIO_MESA = 1.45

let heldComponent = null
let heldMesh     = null
const shelfMeshes   = []
const shelfSlotObjs = {}
const propsInteractivos = []
let hoverSlotId = null
let ultimoHover = 0
let frameCount = 0
let crosshairEl = null

let procActivo   = null
let camTween     = null
let iniciandoProc = false

let modoReto = null
let retoMedicion = false   // Fase 2C: modo multímetro activo durante la inspección de un reto

function pedirActualizarSombras() {
    if (renderer) renderer.shadowMap.needsUpdate = true
}

const _crosshairRay = new THREE.Raycaster()
const _scrFwd   = new THREE.Vector3()
const _scrRight = new THREE.Vector3()
const _scrLook  = new THREE.Vector3()
const _UP       = new THREE.Vector3(0, 1, 0)
const _CENTER   = new THREE.Vector2(0, 0)

// ── Post-ensamble: llevar la PC terminada al banco de pruebas y arrancarla ──
// La PC ensamblada (todas las piezas de PASOS) se reagrupa en `pcCarryGrp` para
// cargarla en brazos; se posa sobre el banco (bancoPruebas) y el monitor de la
// estación muestra un arranque (POST→BIOS→escritorio) que refleja si el
// ensamble quedó aprobado. Estado calibrable por consola con `__lab`.
let pcCargando = false          // el usuario lleva la PC en brazos (modo caminar)
let pcEnBanco  = false          // la PC ya está posada sobre el banco de pruebas
let pcCarryGrp = null           // grupo temporal que sostiene todas las piezas
let pcTween    = null           // traslado de la PC (mesa→banco / banco→mesa)
let bancoPruebas = null         // { x, z, topY } de la estación de pruebas
let cablePC    = null           // cable visual PC→monitor
let bootPC     = null           // { inicio, aprobado, beep } arranque en pantalla
let pruebaArranqueGuardada = false  // evita duplicar el registro de la prueba en la BD
let pruebaFinalPendiente = false    // el ensamble terminó pero falta la prueba de arranque obligatoria
let pantallaPCcanvas = null, pantallaPCtex = null, pantallaPCmesh = null
const PC_CARRY_S = 0.42         // escala de la PC mientras se carga
const PC_BANCO_S = 0.52         // escala de la PC posada en el banco
let pcBancoCfg = null           // { x, y, z, ry } destino calibrable; se rellena al montar

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
    // El reloj de "demora" arranca aquí, cuando el estudiante queda libre para
    // interactuar con la pieza — no al terminar el paso anterior (eso incluía de
    // más el tiempo del video y del quiz de comprensión, inflando falsas demoras).
    sessionStartTime = Date.now()
    mostrarOverlay('3d')
    montarDrone('drone-float-svg')

    const paso = PASOS[idx]
    droneHabla(paso.drone.instalacion)
    activarMarcador(idx)
    renderChecklist()
    updateMissionProgress()
    renderDrawer()
    armarCaminar()
    setHint(`<strong>Instala: ${paso.nombre}</strong> — haz clic en la pieza dentro de la vitrina y luego en el disco luminoso.`)
}

// Asistente/dron flotante desactivado en el simulador 3D: no muestra burbujas
// de mensaje que tapen la interacción.
function droneHabla(msg) {}

// Evaluación formativa: micro-pregunta conceptual tras instalar un componente.
// Da retroalimentación del PORQUÉ y suma a la nota de comprensión.
// Llama onDone() cuando el estudiante pulsa "Continuar".
function mostrarQuizComponente(paso, onDone) {
    // El banco de preguntas por componente es un ARREGLO; se elige una al azar.
    // (Antes se usaba PREGUNTAS_COMPONENTE[id] como objeto único y q.opciones era
    // undefined → el quiz se rompía al intentar pintar las opciones.)
    const q = elegirPreguntaComponente(paso.id)
    if (!q) { onDone(); return }

    fase = 'quiz'
    mostrarOverlay('overlay-quiz')
    montarDrone('drone-quiz')

    const badge = document.getElementById('quiz-badge')
    if (badge) badge.textContent = `Comprensión · ${paso.nombre}`
    const pregEl = document.getElementById('quiz-pregunta')
    if (pregEl) pregEl.textContent = q.pregunta

    const fb = document.getElementById('quiz-feedback')
    if (fb) { fb.hidden = true; fb.className = 'quiz-feedback' }

    const cont = document.getElementById('btn-quiz-continuar')
    if (cont) { cont.hidden = true; cont.onclick = () => onDone() }

    const opcEl = document.getElementById('quiz-opciones')
    if (!opcEl) { onDone(); return }

    const letras = ['A', 'B', 'C', 'D', 'E']
    opcEl.innerHTML = q.opciones.map((op, i) =>
        `<button type="button" class="quiz-opcion" data-idx="${i}">
            <span class="quiz-letra">${letras[i] || i + 1}</span>
            <span class="quiz-texto">${op}</span>
        </button>`).join('')

    preguntasRespondidas++
    let respondida = false

    opcEl.querySelectorAll('.quiz-opcion').forEach(btn => {
        btn.addEventListener('click', () => {
            if (respondida) return
            respondida = true
            const idx = Number(btn.getAttribute('data-idx'))
            const acierto = idx === q.correcta

            opcEl.querySelectorAll('.quiz-opcion').forEach((b, i) => {
                b.disabled = true
                if (i === q.correcta) b.classList.add('is-correcta')
                else if (i === idx) b.classList.add('is-incorrecta')
            })

            if (acierto) {
                aciertosConceptuales++
                LFSound.success()
                appendLog(`Pregunta de ${paso.nombre}: correcta. Suma a tu nota de comprensión.`, 'success')
            } else {
                LFSound.error()
                appendLog(`Pregunta de ${paso.nombre}: incorrecta. Revisa la explicación.`, 'warn')
            }
            // Registra la respuesta conceptual: alimenta la analítica del docente
            // ("¿qué concepto le cuesta a la clase?").
            registrarEvento({ tipo: acierto ? 'quiz_acierto' : 'quiz_error', componenteId: paso.id })

            if (fb) {
                fb.hidden = false
                fb.className = `quiz-feedback ${acierto ? 'ok' : 'fail'}`
                fb.innerHTML = `<strong>${acierto ? '¡Correcto!' : `Respuesta correcta: ${letras[q.correcta]}.`}</strong> ${q.explica}`
            }
            droneHabla(acierto
                ? '¡Muy bien! Entendiste el concepto.'
                : 'No pasa nada: lee la explicación y lo recordarás la próxima vez.')
            if (cont) cont.hidden = false
        })
    })

    droneHabla(`Antes de seguir, comprobemos que entendiste el ${paso.nombre}.`)
}

// Test diagnóstico (pre) o final (post): recorre el banco EVALUACION una pregunta a
// la vez, sin retroalimentación (es una medición, no una lección), y guarda el puntaje.
// Comparar pre vs post da la "ganancia de aprendizaje" que se muestra al final.
// onDone(aciertos) se llama al terminar (o al saltar el diagnóstico).
function mostrarEvaluacion(tipo, onDone) {
    const preguntas = EVALUACION
    if (!preguntas.length) { onDone(null); return }

    fase = 'evaluacion'
    mostrarOverlay('overlay-quiz')
    montarDrone('drone-quiz')

    const badge = document.getElementById('quiz-badge')
    const pregEl = document.getElementById('quiz-pregunta')
    const opcEl = document.getElementById('quiz-opciones')
    const fb = document.getElementById('quiz-feedback')
    const cont = document.getElementById('btn-quiz-continuar')
    const letras = ['A', 'B', 'C', 'D', 'E']
    let idx = 0, aciertos = 0

    const terminar = (valor) => {
        if (tipo === 'pre') { preTestAciertos = valor; preTestHecho = true }
        else postTestAciertos = valor
        onDone(valor)
    }

    const render = () => {
        if (idx >= preguntas.length) { terminar(aciertos); return }
        const q = preguntas[idx]

        if (fb) { fb.hidden = true; fb.className = 'quiz-feedback' }
        if (cont) cont.hidden = true
        if (badge) badge.textContent = tipo === 'pre'
            ? `Test diagnóstico · ${idx + 1}/${preguntas.length}`
            : `Test final · ${idx + 1}/${preguntas.length}`
        if (pregEl) pregEl.textContent = q.pregunta

        if (!opcEl) { terminar(aciertos); return }
        let extra = ''
        if (tipo === 'pre' && idx === 0) {
            extra = `<button type="button" class="quiz-opcion" data-skip="1" style="justify-content:center;opacity:.75">Saltar el diagnóstico</button>`
        }
        opcEl.innerHTML = q.opciones.map((op, i) =>
            `<button type="button" class="quiz-opcion" data-idx="${i}">
                <span class="quiz-letra">${letras[i] || i + 1}</span>
                <span class="quiz-texto">${op}</span>
            </button>`).join('') + extra

        opcEl.querySelectorAll('.quiz-opcion').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.getAttribute('data-skip')) { LFSound.click(); terminar(null); return }
                const elegido = Number(btn.getAttribute('data-idx'))
                if (elegido === q.correcta) { aciertos++; LFSound.success() } else LFSound.error()
                idx++
                render()
            }, { once: true })
        })
    }

    droneHabla(tipo === 'pre'
        ? 'Antes de empezar: un test corto para ver qué sabes ya. Responde con lo que creas, no se penaliza.'
        : '¡Última parte! El mismo test de antes, para medir cuánto aprendiste.')
    render()
}

const NOTA_MINIMA = 7
let notaFinalSesion = 0
let notaBaseSesion  = 0   // nota de destreza+comprensión antes del bono por logros

function calcularNota() {
    const nd = notaDestreza(erroresSesion, demorasSesion)
    // La nota final mezcla la destreza en el ensamble con la comprensión demostrada
    // en las preguntas conceptuales. Así aprobar exige entender, no solo hacer clic.
    if (preguntasRespondidas > 0) {
        return combinarNota(nd, notaConceptual(aciertosConceptuales, preguntasRespondidas))
    }
    return nd
}

function obtenerNombreUsuario() {
    try {
        const u = JSON.parse(authStore.getItem(STORAGE_KEYS.user) || 'null')
        return u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Estudiante'
    } catch { return 'Estudiante' }
}

function mostrarFinal() {
    fase = 'final'
    pruebaFinalPendiente = false
    guardarStatsLocal(true)
    mostrarOverlay('overlay-final')
    montarDrone('drone-final')
    LFSound.complete()

    const t = Math.round((Date.now() - labStartTime) / 1000)
    // La nota definitiva (con bono de logros) ya se fijó en calcularNotaFinal(),
    // antes de la prueba de arranque, para que el POST del banco fuera coherente.
    const notaBase = notaBaseSesion
    const notaFinal = notaFinalSesion
    const aprobado = notaFinal >= NOTA_MINIMA
    const bono = notaFinal - notaBase

    const titEl = document.getElementById('final-title')
    const descEl = document.getElementById('final-desc')
    if (titEl) titEl.innerHTML = aprobado ? '¡PC ensamblada<br>y probada!' : 'Ensamble<br>completado'
    if (descEl) {
        descEl.textContent = aprobado
            ? `¡Aprobado! La PC superó la prueba de arranque (POST) y tu ensamble cumple el estándar (mínimo ${NOTA_MINIMA}/10). Continúa en la app móvil para practicar la instalación real y desbloquear tu certificado.`
            : `El arranque falló: tu nota está por debajo del mínimo aceptable (${NOTA_MINIMA}/10). Repasa el orden y la elección de las piezas, y vuelve a intentarlo.`
    }

    const el = document.getElementById('final-stats')
    if (el) {
        el.innerHTML = `
            <div class="final-stat"><strong>${TOTAL}</strong><span>Componentes<br>instalados</span></div>
            <div class="final-stat"><strong>${formatTiempo(t)}</strong><span>Tiempo de<br>ensamblaje</span></div>
            <div class="final-stat"><strong>${erroresSesion}</strong><span>Errores<br>cometidos</span></div>
            <div class="final-stat"><strong>${aciertosConceptuales}/${preguntasRespondidas}</strong><span>Preguntas<br>acertadas</span></div>
            <div class="final-stat"><strong id="final-nota" style="color:${aprobado ? '#22c55e' : '#ef4444'}">${notaFinal.toFixed(1)}/10</strong><span id="final-nota-lbl">${bono > 0.001 ? `Nota (base ${notaBase.toFixed(1)} +${bono.toFixed(2)} logros)` : 'Nota'}<br>${aprobado ? 'APROBADO' : 'NO APROBADO'}</span></div>`
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
        document.getElementById('btn-descargar-img')?.addEventListener('click', () => descargarImagenEnsamble(notaFinalSesion, aprobado))
        document.getElementById('btn-reintentar')?.addEventListener('click', volverAIntentar)
        document.getElementById('btn-app-movil')?.addEventListener('click', irAppMovil)
    }

    // Ganancia de aprendizaje: compara el test diagnóstico con el final.
    const statsEl = document.getElementById('final-stats')
    if (statsEl && preTestAciertos != null && postTestAciertos != null) {
        const total = EVALUACION.length
        const pct = Math.round(gananciaAprendizaje(preTestAciertos, postTestAciertos, total) * 100)
        const mejora = postTestAciertos - preTestAciertos
        let msg
        if (mejora > 0) msg = `📈 Pasaste de <strong>${preTestAciertos}/${total}</strong> a <strong>${postTestAciertos}/${total}</strong> en el test conceptual — ganancia de aprendizaje <strong>${pct}%</strong>. ¡Bien!`
        else if (mejora === 0) msg = `Mantuviste <strong>${postTestAciertos}/${total}</strong> entre el test inicial y el final.`
        else msg = `Test inicial <strong>${preTestAciertos}/${total}</strong>, final <strong>${postTestAciertos}/${total}</strong>. Repasa los conceptos y vuelve a intentarlo.`
        let box = document.getElementById('final-ganancia')
        if (!box) {
            box = document.createElement('p')
            box.id = 'final-ganancia'
            box.style.cssText = 'margin:14px auto 0;max-width:560px;font-size:14.5px;line-height:1.6;color:rgba(255,255,255,.82);background:rgba(255,255,255,.06);border-left:3px solid var(--lf-accent-400,#c98a3a);border-radius:10px;padding:12px 16px'
            statsEl.insertAdjacentElement('afterend', box)
        }
        box.innerHTML = msg
    }

    const aviso = document.getElementById('final-aviso')
    if (aviso) aviso.style.display = 'none'

    // Persiste la dimensión conceptual para que el docente pueda evaluarla.
    const comprensionPct = preguntasRespondidas > 0
        ? Math.round((aciertosConceptuales / preguntasRespondidas) * 100)
        : null
    const gan = (preTestAciertos != null && postTestAciertos != null)
        ? gananciaAprendizaje(preTestAciertos, postTestAciertos, EVALUACION.length)
        : null
    guardarComprension({
        comprensionPct,
        preTest: preTestAciertos,
        postTest: postTestAciertos,
        evalTotal: (preTestAciertos != null || postTestAciertos != null) ? EVALUACION.length : null,
        ganancia: gan
    }).catch(() => {})

    registrarAprobacionWeb(aprobado, notaFinal)
}

// Nota definitiva de la sesión: otorga los logros ganados y aplica su bono.
// Se calcula ANTES de la prueba de arranque para que el POST del banco refleje
// con exactitud si el ensamble aprueba (nota final ≥ mínimo), no la nota base.
async function calcularNotaFinal() {
    const ganados = ['primera_pc', 'componente_estrella']
    if (erroresSesion === 0) ganados.push('sin_errores')
    try { await otorgarLogros(ganados, 'ensamble:final') } catch (_) {}

    let nLogros = 0
    try { nLogros = (await obtenerLogrosUsuario()).length } catch (_) {}

    notaBaseSesion  = calcularNota()
    notaFinalSesion = notaConBono(notaBaseSesion, nLogros)
    return notaFinalSesion
}

// Tras el ensamble y el test final, la simulación NO termina: el estudiante debe
// llevar la PC al banco y encenderla. Solo al completar ese arranque se muestra
// el resumen (mostrarFinal) y se registra la aprobación. En equipos táctiles (sin
// mouse/teclado para caminar) se omite la prueba manual y se pasa directo al
// resumen para no dejar bloqueada la sesión.
async function iniciarPruebaFinal() {
    await calcularNotaFinal()

    if (ES_TACTIL) { mostrarFinal(); return }

    pruebaFinalPendiente = true
    fase = '3d'
    mostrarOverlay('3d')

    const tit = document.getElementById('walk-start-title')
    const sub = document.getElementById('walk-start-sub')
    if (tit) tit.textContent = '▶ Probar la PC'
    if (sub) sub.innerHTML = 'Clic para caminar · lleva la PC al <b>banco de pruebas</b> y pulsa <b>E</b> para encenderla'

    actualizarOverlayWalk()
    guiaBanco('Prueba de arranque (obligatoria)',
        'El ensamble está completo, pero la simulación aún no termina. Apunta a la PC de la mesa central y pulsa E para levantarla; llévala al banco de pruebas (pared derecha) y pulsa E para encenderla.')
    droneHabla('¡Ensamble completo! Falta la prueba final: lleva la PC al banco de pruebas y enciéndela. Solo si arranca correctamente se aprueba la simulación.')
}

async function registrarAprobacionWeb(aprobado, notaFinal) {
    if (!aprobado) return
    try {
        const fotoPath = await subirImagenEnsamble(notaFinal, true)
        await marcarAprobacionWeb({ nota: notaFinal, fotoPath })
        appendLog('Aprobación web registrada para tu certificado.', 'success')
    } catch (err) {
        console.warn('[LogicFlow] No se pudo registrar la aprobación web:', err.message)
    }
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
        aviso.innerHTML = '✓ <strong>Aprobación registrada.</strong> Abre la app móvil de LogicFlow, completa la instalación real guiada y desbloquea tu <strong>certificado</strong> con el tiempo total y la foto de tu PC.'
    }
}

function explorarTaller() {
    fase = '3d'
    mostrarOverlay('3d')
    const tit = document.getElementById('walk-start-title')
    const sub = document.getElementById('walk-start-sub')
    if (tit) tit.textContent = '▶ Explorar el taller'
    if (sub) sub.innerHTML = 'Clic para caminar · <b>WASD</b> moverse · <b>Esc</b> para los menús'
    actualizarOverlayWalk()
    guiaBanco('¡PC ensamblada con éxito!', 'Camina con W/A/S/D. Acércate a la PC en la mesa central, apúntala y pulsa E para levantarla y llevarla al banco de pruebas (pared derecha) — ahí se conecta al monitor y arranca.')
    droneHabla('¡Tu PC está lista! Llévala al banco de pruebas para encenderla: apúntala y pulsa E para cargarla.')
}

function construirCanvasEnsamble(nota, aprobado) {
    if (!renderer || !scene || !camera) return null

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

    return out
}

function descargarImagenEnsamble(nota, aprobado) {
    const out = construirCanvasEnsamble(nota, aprobado)
    if (!out) return
    try {
        const a = document.createElement('a')
        const slug = obtenerNombreUsuario().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        a.download = `ensamble-logicflow-${slug || 'estudiante'}.png`
        a.href = out.toDataURL('image/png')
        a.click()
        appendLog('Imagen del ensamble descargada.', 'success')
    } catch (err) {
        appendLog('No se pudo generar la imagen: ' + err.message, 'warn')
    }
}

function subirImagenEnsamble(nota, aprobado) {
    return new Promise(resolve => {
        const out = construirCanvasEnsamble(nota, aprobado)
        if (!out) { resolve(null); return }
        out.toBlob(async blob => {
            const path = await subirFotoSimulador(blob)
            resolve(path)
        }, 'image/png')
    })
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

// Deshace el paso "idx" (y todos los posteriores) y deja al estudiante listo para
// reinstalarlo. El checklist marca "clickable" (con el ícono ↩) los pasos i < indiceActual
// esperando que hacer clic en uno de ellos lo deshaga a ÉL, no al siguiente.
function retrocederA(idx) {
    PASOS.forEach((p, i) => {
        if (i >= idx) {
            const m = modelos3D[p.id]
            if (m) m.visible = false
            // Restaura el aspecto "disponible" del estante: soltarComponenteInstalado()
            // lo había dejado atenuado (opacity 0.35) al marcarlo como ya instalado.
            const slotGrupo = shelfSlotObjs[p.id]
            if (slotGrupo) {
                slotGrupo.traverse(n => {
                    if (n.isMesh && !n.userData.isPlaceholder && n.material) {
                        n.material.opacity = 1
                        n.material.transparent = false
                    }
                })
                slotGrupo.visible = true
            }
        }
    })
    indiceActual = idx
    localStorage.setItem(LS_KEY, JSON.stringify(PASOS.slice(0, idx).map(p => p.id)))
    selectedComponent = null
    renderChecklist()
    updateMissionProgress()
    renderDrawer()
    mostrarFase3D(indiceActual)
    appendLog(`Regresaste al paso ${idx + 1}: ${PASOS[indiceActual]?.nombre || ''}`, 'info')
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
    dibujarPantallaTaller()
}

// La consola/registro en pantalla se eliminó: no se muestra ningún log al
// usuario. Se conserva solo la retroalimentación sonora (no tapa la interacción).
function appendLog(msg, type = 'system') {
    if (type === 'success') LFSound.success()
    else if (type === 'warn' || type === 'warning') LFSound.error()
}

// Banner de pista flotante desactivado: no se muestra nada sobre el 3D.
// La guía del paso vive en el panel lateral (#instruction-p) y el encabezado.
function setHint(msg) {}

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

function setMouseDesdeEvento(e) {
    const rect = canvas.getBoundingClientRect()
    mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
    mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
}

function onCanvasClick(e) {
    if (procActivo) { clicProcedimiento(e); return }
    if (walkMode) return
    if (modoReto) { clicReto(e); return }
    setMouseDesdeEvento(e)
    raycaster.setFromCamera(mouse, camera)

    if (selectedComponent) {
        const hits = raycaster.intersectObjects(slotDiscs)
        const hit = hits.find(h => h.object.userData.id === selectedComponent.id)
        if (hit) {
            if (tieneProcedimiento(selectedComponent.id)) iniciarProcedimiento(selectedComponent)
            else finalizarPaso(selectedComponent)
            return
        }
    }

    const sHits = raycaster.intersectObjects(shelfMeshes)
    if (sHits.length) {
        const { pasoId, idx } = sHits[0].object.userData
        const paso = PASOS[idx]
        if (idx < indiceActual) {
            mostrarErrorVisual(`"${paso.nombre}" ya está instalado.`)
        } else if (idx > indiceActual) {
            mostrarErrorVisual(`Aún no toca: instala "${PASOS[indiceActual]?.nombre}".`)
        } else {
            handleSelection(pasoId)
        }
        return
    }

    if (propsInteractivos.length) {
        const pHits = raycaster.intersectObjects(propsInteractivos, true)
        if (pHits.length) {
            let obj = pHits[0].object
            while (obj && !obj.userData.fact && !obj.userData.onClic) obj = obj.parent
            if (obj?.userData.onClic) { obj.userData.onClic(); return }
            if (obj?.userData.fact) { droneHabla(obj.userData.fact); return }
        }
    }

    if (selectedComponent) {
        droneHabla(`Haz clic sobre el disco luminoso de "${selectedComponent.nombre}".`)
    } else {
        droneHabla('Haz clic sobre un componente de la vitrina para seleccionarlo.')
    }
}

function onCanvasHover(e) {
    if (walkMode || procActivo || fase !== '3d' || !camera) return
    const ahora = performance.now()
    if (ahora - ultimoHover < 70) return
    ultimoHover = ahora

    setMouseDesdeEvento(e)
    raycaster.setFromCamera(mouse, camera)

    if (modoReto) {
        const dHits = raycaster.intersectObjects(slotDiscs)
        if (dHits.length) {
            const p = PASOS.find(x => x.id === dHits[0].object.userData.id)
            canvas.style.cursor = 'pointer'
            if (p) setHint(modoReto.fase === 'reparacion'
                ? `<strong>${p.nombre}</strong> — clic para instalar el repuesto aquí.`
                : `<strong>🔍 ${p.nombre}</strong> — clic para inspeccionar${modoReto.inspeccionados.has(p.id) ? ' de nuevo' : ''}.`)
            return
        }
        const sHitsReto = raycaster.intersectObjects(shelfMeshes)
        canvas.style.cursor = sHitsReto.length ? 'pointer' : ''
        return
    }

    const hits = raycaster.intersectObjects(shelfMeshes)
    const nuevo = hits.length ? hits[0].object.userData.pasoId : null
    if (nuevo === hoverSlotId) return

    if (hoverSlotId) aplicarHoverSlot(hoverSlotId, false)
    hoverSlotId = nuevo
    if (hoverSlotId) aplicarHoverSlot(hoverSlotId, true)
    canvas.style.cursor = hoverSlotId ? 'pointer' : ''
}

function aplicarHoverSlot(pasoId, activo) {
    const slot = shelfSlotObjs[pasoId]
    if (!slot) return
    slot.scale.setScalar(activo ? 1.05 : 1)
    const led = slot.userData.ledMat
    if (led) led.emissiveIntensity = activo ? 3.4 : 1.6
    if (activo) {
        const idx = PASOS.findIndex(p => p.id === pasoId)
        const estado = modoReto
            ? 'pieza de repuesto'
            : idx < indiceActual ? 'ya instalado' : idx === indiceActual ? 'clic para seleccionar' : 'bloqueado por ahora'
        setHint(`<strong>${PASOS[idx].brand} ${PASOS[idx].nombre}</strong> — ${estado}.`)
    }
}

function entrarCaminar() {
    if (!walkControls || walkMode || fase !== '3d') return
    if (modoReto && camera) {
        const eyeY = SALA.y0 + ALTURA_OJOS
        camera.position.set(0, eyeY, 3.0)
    }
    walkControls.lock()
}

function onWalkLock() {
    walkMode = true
    if (modoReto && controls) controls.enabled = false
    const card = document.getElementById('walk-start')
    if (card) card.style.display = 'none'
    const ch = document.getElementById('crosshair')
    if (ch) ch.style.display = 'block'
    appendLog(modoReto
        ? 'Caminando por el taller. E = inspeccionar/tomar/instalar · Esc = diagnosticar en el panel.'
        : 'Caminando. E = agarrar/instalar · Q = soltar · Esc = menús.', 'info')
}

function onWalkUnlock() {
    walkMode = false
    for (const k in teclas) teclas[k] = false
    const ch = document.getElementById('crosshair')
    if (ch) ch.style.display = 'none'

    if (iniciandoProc) { iniciandoProc = false; return }

    if (modoReto && controls) controls.enabled = true
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
    const retoExplorable = !modoReto || (modoReto.fase === 'inspeccion' || modoReto.fase === 'reparacion')
    const mostrar = fase === '3d' && !walkMode && !selectedComponent && !heldComponent && retoExplorable
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

    const recorrido = Math.hypot(obj.position.x - ax, obj.position.z - az)
    if (recorrido > 0.0001) {
        distCaminata += recorrido
        if (distCaminata > 0.85) { distCaminata = 0; LFSound.footstep() }
    }
}

function colisionarSala(pos, prevX, prevZ) {
    const m = 0.4
    pos.x = Math.min(SALA.xMax - m, Math.max(SALA.xMin + m, pos.x))
    pos.z = Math.min(SALA.zMax - m, Math.max(SALA.zMin + m, pos.z))

    if (Math.hypot(pos.x, pos.z) < RADIO_MESA) {
        pos.x = prevX
        pos.z = prevZ
    }

    if (Math.abs(pos.x) < VITRINA.w / 2 + 0.30 && pos.z > VITRINA.frontZ - 0.30) {
        pos.z = VITRINA.frontZ - 0.30
    }
}

async function finalizarPaso(paso) {
    if (instalandoPaso) return
    instalandoPaso = true
    try {
        await finalizarPasoInterno(paso)
    } finally {
        instalandoPaso = false
    }
}

async function finalizarPasoInterno(paso) {
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
    guardarStatsLocal()
    renderChecklist()
    updateMissionProgress()

    setTimeout(() => {
        const continuar = () => {
            if (indiceActual < TOTAL) mostrarVideo(indiceActual)
            else mostrarEvaluacion('post', () => iniciarPruebaFinal())  // test final, luego prueba de arranque
        }
        // El quiz NUNCA debe poder dejar al estudiante en un overlay roto sin salida:
        // si algo falla al pintarlo, continuamos igual con el siguiente componente.
        try {
            mostrarQuizComponente(paso, continuar)
        } catch (err) {
            console.warn('[LogicFlow] Quiz de componente falló; se avanza igual:', err?.message)
            continuar()
        }
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

    renderer = new THREE.WebGLRenderer({ canvas, antialias: !EQUIPO_MODESTO, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, EQUIPO_MODESTO ? 1 : 1.5))
    renderer.setSize(w, h, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = EQUIPO_MODESTO ? THREE.BasicShadowMap : THREE.PCFShadowMap

    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true

    const pmrem = new THREE.PMREMGenerator(renderer)
    // Entorno neutro inmediato (se ve algo antes de que llegue el HDRI).
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    // HDRI real de un taller de máquinas (CC0, Poly Haven): da reflejos
    // característicos en los metales del hardware en vez de un gris plano.
    new RGBELoader().load('assets/hdri/machine_shop_01_1k.hdr', (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping
        const envMap = pmrem.fromEquirectangular(hdr).texture
        scene.environment = envMap
        hdr.dispose()
        pedirActualizarSombras()
        appendLog('Entorno HDRI del taller cargado.', 'success')
    }, undefined, () => appendLog('HDRI del taller no disponible; se usa entorno neutro.', 'system'))

    crosshairEl = document.getElementById('crosshair')

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance   = 0.7
    controls.maxDistance   = 4.5
    controls.maxPolarAngle = Math.PI / 2 - 0.04
    controls.target.set(0, 0.78, 0)

    canvas.addEventListener('click', onCanvasClick)
    canvas.addEventListener('pointermove', onCanvasHover)

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
        get renderer() { return renderer },
        modelos3D, PASOS, THREE, propsTaller, mixers,
        setProp(id, o = {}) {
            const g = propsTaller[id]
            if (!g) return `no existe prop "${id}" (ids: ${Object.keys(propsTaller).join(', ')})`
            if (o.x != null) g.position.x = o.x
            if (o.y != null) g.position.y = o.y
            if (o.z != null) g.position.z = o.z
            if (o.ry != null) g.rotation.y = o.ry
            if (o.s != null) g.children[0]?.scale.multiplyScalar(o.s)
            pedirActualizarSombras()
            const r = n => Math.round(n * 1000) / 1000
            return { pos: g.position.toArray().map(r), ry: r(g.rotation.y) }
        },
        ssdSet(p = 1) {   // debug: evalúa el despiece del SSD en [0..1] y renderiza
            if (ssdPartes) { ssdProg = ssdTarget = p; aplicarTeardownSSD(p); renderer.render(scene, camera) }
            return p
        },
        // ── Prueba de arranque: calibración/depuración ──
        setPantallaPC(cfg = {}) { setPantallaPC(cfg); return pantallaPCmesh ? { pos: pantallaPCmesh.position.toArray(), size: [pantallaPCmesh.geometry.parameters.width, pantallaPCmesh.geometry.parameters.height] } : 'aún no cargó el monitor' },
        setPCBanco(cfg = {}) { if (pcBancoCfg) Object.assign(pcBancoCfg, cfg); if (pcEnBanco && pcCarryGrp && pcBancoCfg) { pcCarryGrp.position.set(pcBancoCfg.x, alturaBaseBanco(), pcBancoCfg.z); pcCarryGrp.rotation.y = pcBancoCfg.ry; crearCablePC(); renderer.render(scene, camera) } return pcBancoCfg },
        agarrarPC() { agarrarPC(); return 'PC en brazos' },
        probarPC() {   // debug: teletransporta la PC al banco y arranca (sin caminar)
            if (fase !== '3d') fase = '3d'
            if (!pcCarryGrp) agarrarPC()
            if (pcBancoCfg && pcCarryGrp) { pcCargando = false; pcEnBanco = true; pcCarryGrp.scale.setScalar(PC_BANCO_S); pcCarryGrp.position.set(pcBancoCfg.x, alturaBaseBanco(), pcBancoCfg.z); pcCarryGrp.rotation.y = pcBancoCfg.ry; arrancarPC() }
            return 'arrancando'
        },
        bootPC(el = 3.5, forzarAprobado = null) {   // debug: pinta un fotograma del arranque a t=el segundos
            const aprobado = forzarAprobado != null ? !!forzarAprobado : notaFinalSesion >= NOTA_MINIMA
            bootPC = { inicio: performance.now() - el * 1000, aprobado, beep: true, chime: true }
            dibujarPantallaPC(); if (renderer) renderer.render(scene, camera)
            return { aprobado, el, canvas: pantallaPCcanvas ? pantallaPCcanvas.toDataURL('image/png') : null }
        },
        medirReto(id) {   // debug: activa el multímetro y mide un componente en un reto
            if (!modoReto || modoReto.fase !== 'inspeccion') return 'no hay reto en inspección'
            retoMedicion = true
            medirComponenteReto(id)
            return medicionReto(id)
        },
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









function crearVitrinaComponentes(grupo) {
    const { cols, slotW, depth, backZ, frontZ, w, baseH, rowH } = VITRINA
    const ROWS  = Math.ceil(PASOS.length / cols)
    const CX_Z  = (backZ + frontZ) / 2
    const H     = baseH + ROWS * rowH + 0.06
    const yBase = SALA.y0

    const woodTex  = crearTexturaMaderaClara(); woodTex.repeat.set(3, 1)
    const mWood    = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.58, metalness: 0.02 })
    const mTrim    = new THREE.MeshStandardMaterial({ map: crearTexturaMadera(), roughness: 0.55, metalness: 0.05 })
    const mDark    = new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.55, roughness: 0.45 })

    const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.26, H, 0.05), mWood)
    back.position.set(0, yBase + H / 2, backZ)
    back.receiveShadow = true
    grupo.add(back)

    ;[-1, 1].forEach(s => {
        const lado = new THREE.Mesh(new THREE.BoxGeometry(0.07, H, depth + 0.04), mTrim)
        lado.position.set(s * (w / 2 + 0.10), yBase + H / 2, CX_Z)
        lado.castShadow = true
        grupo.add(lado)
    })

    const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, baseH - 0.04, depth - 0.04), mWood)
    base.position.set(0, yBase + (baseH - 0.04) / 2, CX_Z)
    base.castShadow = base.receiveShadow = true
    grupo.add(base)

    for (let d = 1; d < cols; d++) {
        const ranura = new THREE.Mesh(new THREE.BoxGeometry(0.012, baseH - 0.22, 0.012), mDark)
        ranura.position.set(-w / 2 + d * slotW, yBase + baseH / 2 - 0.04, frontZ - 0.002)
        grupo.add(ranura)
    }
    for (let d = 0; d < cols; d++) {
        const tirador = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.024, 0.024), mDark)
        tirador.position.set(-w / 2 + (d + 0.5) * slotW, yBase + baseH - 0.20, frontZ - 0.012)
        grupo.add(tirador)
    }
    const zocalo = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.10, depth - 0.10), mDark)
    zocalo.position.set(0, yBase + 0.05, CX_Z + 0.03)
    grupo.add(zocalo)

    for (let r = 0; r <= ROWS; r++) {
        const esTapa = r === ROWS
        const board = new THREE.Mesh(
            new THREE.BoxGeometry(w + (esTapa ? 0.30 : 0.14), esTapa ? 0.06 : 0.05, depth + (esTapa ? 0.08 : 0)),
            esTapa ? mTrim : mWood
        )
        board.position.set(0, yBase + baseH + r * rowH - 0.025, CX_Z)
        board.castShadow = board.receiveShadow = true
        grupo.add(board)
    }

    const mLed = new THREE.MeshStandardMaterial({ color: 0xffe8c4, emissive: 0xffd9a0, emissiveIntensity: 1.4, roughness: 1 })
    for (let r = 0; r < ROWS; r++) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(w - 0.15, 0.014, 0.014), mLed)
        led.position.set(0, yBase + baseH + (r + 1) * rowH - 0.075, frontZ + 0.06)
        grupo.add(led)
    }

    const letreroBoard = new THREE.Mesh(new THREE.BoxGeometry(w + 0.30, 0.36, 0.07), mTrim)
    letreroBoard.position.set(0, yBase + H + 0.22, backZ - 0.02)
    letreroBoard.castShadow = true
    grupo.add(letreroBoard)
    const letrero = new THREE.Mesh(
        new THREE.PlaneGeometry(w + 0.16, 0.30),
        new THREE.MeshStandardMaterial({ map: crearTexturaLetreroComponentes(), roughness: 0.5 })
    )
    letrero.position.set(0, yBase + H + 0.22, backZ - 0.062)
    letrero.rotation.y = Math.PI
    grupo.add(letrero)

    const foco = new THREE.PointLight(0xffe6c0, 3.0, 5.0, 2)
    foco.position.set(0, yBase + H + 0.05, frontZ - 0.35)
    grupo.add(foco)

    PASOS.forEach((paso, i) => {
        const col = i % cols
        const row = i < cols ? ROWS - 1 : ROWS - 2 - Math.floor((i - cols) / cols)
        const cx  = -w / 2 + slotW * (col + 0.5)
        const cy  = yBase + baseH + Math.max(row, 0) * rowH

        const slotGrupo = new THREE.Group()
        slotGrupo.position.set(cx, cy, CX_Z)

        const hitbox = new THREE.Mesh(
            new THREE.BoxGeometry(slotW * 0.92, rowH - 0.10, depth - 0.06),
            new THREE.MeshBasicMaterial({ visible: false })
        )
        hitbox.position.y = (rowH - 0.10) / 2
        hitbox.userData = { tipo: 'shelf-item', pasoId: paso.id, idx: i }
        slotGrupo.add(hitbox)
        shelfMeshes.push(hitbox)

        const pedW = slotW * 0.72
        const ped = new THREE.Mesh(new THREE.BoxGeometry(pedW, 0.022, 0.40), mTrim)
        ped.position.set(0, 0.011, -0.02)
        slotGrupo.add(ped)

        const ledMat = new THREE.MeshStandardMaterial({
            color: paso.color, emissive: paso.color, emissiveIntensity: 1.6, roughness: 1
        })
        const ledPed = new THREE.Mesh(new THREE.BoxGeometry(pedW * 0.88, 0.010, 0.010), ledMat)
        ledPed.position.set(0, 0.020, -0.225)
        slotGrupo.add(ledPed)
        slotGrupo.userData.ledMat = ledMat

        const ph = new THREE.Mesh(
            new THREE.BoxGeometry(slotW * 0.42, 0.22, 0.12),
            new THREE.MeshStandardMaterial({
                color: paso.color, emissive: paso.color, emissiveIntensity: 0.30,
                metalness: 0.15, roughness: 0.55
            })
        )
        ph.position.set(0, 0.135, -0.02)
        ph.userData.isPlaceholder = true
        slotGrupo.add(ph)

        const npGrp = new THREE.Group()
        const placa = new THREE.Mesh(
            new THREE.BoxGeometry(slotW * 0.80, 0.062, 0.009),
            new THREE.MeshStandardMaterial({ color: 0x5a4632, metalness: 0.2, roughness: 0.6 })
        )
        npGrp.add(placa)
        const labelPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(slotW * 0.74, 0.048),
            new THREE.MeshBasicMaterial({ map: crearTexturaEtiqueta(paso.nombre), transparent: true, depthWrite: false, side: THREE.DoubleSide })
        )
        labelPlane.position.z = -0.006
        labelPlane.rotation.y = Math.PI
        npGrp.add(labelPlane)
        npGrp.position.set(0, -0.004, -depth / 2 + 0.012)
        npGrp.rotation.x = 0.22
        slotGrupo.add(npGrp)

        if (col > 0) {
            const div = new THREE.Mesh(new THREE.BoxGeometry(0.014, rowH - 0.10, 0.022), mTrim)
            div.position.set(-slotW / 2, rowH / 2 - 0.03, depth / 2 - 0.10)
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
    if (ph) {
        slotGrupo.remove(ph)
        ph.geometry?.dispose()
        ph.material?.dispose()
    }

    const DISP_MAX = 0.40
    const clone = innerObj.clone(true)
    const shelfScale = paso.shelfScale ?? 1
    clone.scale.multiplyScalar((DISP_MAX / paso.size) * shelfScale)

    clone.rotation.set(
        paso.shelfRotX ?? 0,
        paso.shelfRotY ?? -Math.PI / 5,
        paso.shelfRotZ ?? 0
    )

    clone.position.set(0, 0, 0)
    const bbox = new THREE.Box3().setFromObject(clone)
    const centro = bbox.getCenter(new THREE.Vector3())
    const baseOffset = paso.id === 'mb' ? 0.028 : 0.004
    clone.position.x = -centro.x
    clone.position.z = -centro.z + (paso.shelfOffsetZ ?? -0.02)
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
        // Solo son intermedias cuando hubo fusión; con un único mesh, "merged" ES geos[0].
        if (geos.length > 1) geos.forEach(g => g.dispose())
    }
    return grupo
}

function agarrarComponente(pasoId) {
    const paso = PASOS.find(p => p.id === pasoId)
    if (!paso) return

    const slotGrupo = shelfSlotObjs[pasoId]
    if (slotGrupo) slotGrupo.visible = false

    if (heldMesh) { scene.remove(heldMesh); disposeGroup(heldMesh) }
    heldMesh = new THREE.Group()
    const modelGrp = modelos3D[paso.id]
    if (modelGrp && modelGrp.children[0]) {
        const innerClone = modelGrp.children[0].clone(true)
        const HELD_SIZE = 0.18
        innerClone.scale.multiplyScalar(HELD_SIZE / paso.size)
        innerClone.rotation.set(paso.rot?.x || 0, paso.rot?.y || 0, paso.rot?.z || 0)

        innerClone.position.set(0, 0, 0)
        const bb = new THREE.Box3().setFromObject(innerClone)
        innerClone.position.copy(bb.getCenter(new THREE.Vector3()).negate())
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
    if (heldMesh) { scene.remove(heldMesh); disposeGroup(heldMesh); heldMesh = null }
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
                    // Algunos meshes del estante (pedestal, divisores) comparten un
                    // material entre TODOS los slots (ver mTrim en la construcción
                    // del estante); solo podemos liberar el clon que nosotros mismos
                    // creamos en una vuelta anterior, nunca el material compartido.
                    const anterior = n.material
                    n.material = n.material.clone()
                    n.material.opacity = 0.35
                    n.material.transparent = true
                    n.material.emissiveIntensity = 0
                    n.material.userData.esClonEstante = true
                    if (anterior.userData?.esClonEstante) anterior.dispose()
                }
            }
        })
        slotGrupo.visible = true
    }
    if (heldMesh) { scene.remove(heldMesh); disposeGroup(heldMesh); heldMesh = null }
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
        guardarStatsLocal()
        const elapsed = Math.round((Date.now() - sessionStartTime) / 1000)
        registrarEvento({
            tipo: 'error_pieza',
            componenteId: heldComponent.id,
            componenteEsperado: needed.id,
            segundos: elapsed
        })
        mostrarErrorVisual(`Incorrecto: se necesita "${needed.nombre}", no "${heldComponent.nombre}".`)

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

    if (modoReto) { interactuarEReto(eRay); return }

    // Post-ensamble: cargar la PC terminada y probarla en el banco de pruebas.
    if (indiceActual >= TOTAL && !heldComponent) {
        if (pcCargando) {
            const near = bancoPruebas && camera &&
                Math.hypot(camera.position.x - bancoPruebas.x, camera.position.z - bancoPruebas.z) < 1.9
            const banco = [propsTaller.workbench, propsTaller.monitor].filter(Boolean)
            if (near || eRay.intersectObjects(banco, true).length) { colocarPCEnBanco(); return }
            guiaBanco('Prueba de arranque', 'Acércate al banco de pruebas (pared derecha) y pulsa E para conectar la PC. Q para dejarla.')
            return
        }
        if (eRay.intersectObjects(pcPickList(), true).length) { agarrarPC(); return }
        // Si no apunta a la PC ni al banco, continúa con el manejo normal.
    }

    if (!heldComponent) {

        const hits = eRay.intersectObjects(shelfMeshes)
        if (hits.length > 0 && hits[0].object.userData.tipo === 'shelf-item') {
            const pasoId = hits[0].object.userData.pasoId
            const pasoIdx = PASOS.findIndex(p => p.id === pasoId)
            if (pasoIdx < indiceActual) {
                droneHabla('Este componente ya está instalado en el PC.')
                return
            }
            if (pasoIdx > indiceActual) {
                droneHabla(`Aún no toca: instala "${PASOS[indiceActual]?.nombre}".`)
                return
            }
            agarrarComponente(pasoId)
        } else {

            const pHits = eRay.intersectObjects(propsInteractivos, true)
            if (pHits.length) {
                let obj = pHits[0].object
                while (obj && !obj.userData.fact && !obj.userData.onClic) obj = obj.parent
                if (obj?.userData.onClic) { obj.userData.onClic(); return }
                if (obj?.userData.fact) { droneHabla(obj.userData.fact); return }
            }
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

function interactuarEReto(eRay) {
    const M = modoReto
    if (!M || (M.fase !== 'inspeccion' && M.fase !== 'reparacion')) return

    if (M.fase === 'inspeccion') {
        const dHits = eRay.intersectObjects(slotDiscs)
        if (dHits.length) {
            const id = dHits[0].object.userData.id
            if (retoMedicion) medirComponenteReto(id); else inspeccionarReto(id)
            return
        }

        const pHits = eRay.intersectObjects(propsInteractivos, true)
        if (pHits.length) {
            let obj = pHits[0].object
            while (obj && !obj.userData.fact && !obj.userData.onClic) obj = obj.parent
            if (obj?.userData.onClic) { obj.userData.onClic(); return }
            if (obj?.userData.fact) { droneHabla(obj.userData.fact); return }
        }
        droneHabla('Apunta al disco luminoso de un componente y pulsa E para inspeccionarlo. Cuando sepas cuál falla, pulsa Esc y márcalo en el panel de diagnóstico.')
        return
    }

    // Fase reparación: tomar el repuesto de la vitrina, instalarlo y, en la
    // secuencia especial de CPU, retirar/montar el disipador y aplicar pasta.
    const sHits = eRay.intersectObjects(shelfMeshes)
    if (sHits.length) { tomarRepuestoReto(sHits[0].object.userData.pasoId); return }

    const dHits = eRay.intersectObjects(slotDiscs)
    if (dHits.length && clicDiscoReto(dHits)) return

    if (clicPropReto(eRay.intersectObjects(propsInteractivos, true))) return

    droneHabla('Apunta al repuesto en la vitrina o al disco luminoso de la PC y pulsa E.')
}

const PROCEDIMIENTOS = { cpu: construirProcedimientoCPU, mb: construirProcedimientoMB, cooler: construirProcedimientoCooler, ram: construirProcedimientoRAM, gpu: construirProcedimientoGPU, power: construirProcedimientoPSU }

// Procedimiento de instalación guiada desactivado por completo: al instalar una
// pieza se coloca directamente (finalizarPaso), sin pasos, hotspots ni panel.
function tieneProcedimiento(id) { return false }

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
        hotspot(mesh, data) { mesh.userData.proc = data; grupo.add(mesh); this.hotspots.push(mesh); return mesh },
        enfocarCamara(...args) { enfocarCamara(...args) },
        setHint(...args) { setHint(...args) }
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
        LFSound.snap()
        const done = () => avanzarPasoProc()
        if (d.alAcertar) d.alAcertar(done); else done()
    } else if (d.accion === 'mal') {
        P.errores++; erroresSesion++
        const subPaso = P.pasos[P.idx]?.titulo || null
        const elapsed = Math.round((Date.now() - sessionStartTime) / 1000)

        registrarEvento({
            tipo: 'error_ensamble',
            componenteId: P.paso.id,
            detalle: subPaso,
            segundos: elapsed
        })
        droneHabla(d.motivo || 'Eso no es correcto. Observa bien e inténtalo de nuevo.')
        appendLog(`Paso incorrecto en "${P.paso.nombre}"${subPaso ? ` (${subPaso})` : ''}.`, 'warn')
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

    const segsProc = Math.round((Date.now() - sessionStartTime) / 1000)
    registrarEvento({ tipo: 'acierto_ensamble', componenteId: paso.id, detalle: paso.nombre, segundos: segsProc })
    if (errores === 0) {
        const ganados = ['ensamble_perfecto']
        if (PROC_LOGRO[paso.id]) ganados.push(PROC_LOGRO[paso.id])
        otorgarLogros(ganados, `ensamble:${paso.id}`)
        notificarLogro(`Procedimiento impecable: "${paso.nombre}" sin errores.`)
    }

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


const MATERIAL_MAP_KEYS = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'bumpMap']

function disposeGroup(g) {
    g.traverse(o => {
        if (o.isMesh) {
            o.geometry?.dispose?.()
            const m = o.material
            ;(Array.isArray(m) ? m : [m]).forEach(x => {
                if (!x) return
                MATERIAL_MAP_KEYS.forEach(k => x[k]?.dispose?.())
                x.dispose?.()
            })
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
    document.getElementById('hint-box')?.classList.add('con-panel-proc')
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
    document.getElementById('hint-box')?.classList.remove('con-panel-proc')
}

// Las primitivas de procedimiento viven en ./juego-proc-helpers.js y los
// constructores construirProcedimiento* en ./juego-procedimientos.js (ambos
// importados arriba). Aquí abajo queda solo su orquestación.

const SALA = { xMin: -5, xMax: 5, zMin: -4, zMax: 5, y0: -1.0, h: 3.6 }

const VITRINA = (() => {
    const cols  = 4
    const slotW = 1.06
    const depth = 0.56
    const backZ = SALA.zMax - 0.05
    return {
        cols, slotW, depth, backZ,
        w: cols * slotW,
        frontZ: backZ - depth,
        baseH: 1.12,
        rowH: 0.78
    }
})()

// Devuelve un set de mapas PBR (baseColor/normal/AO-Rough-Metal empacado) para
// piso/paredes del taller. Cachea por `base` y comparte las texturas entre las
// 4 paredes (repeat compartido) para no multiplicar la VRAM. El `arm` empacado
// se usa como roughnessMap+metalnessMap (three lee rough=verde, metal=azul).
const _pbrCache = {}
function pbrTaller(base, rx, ry) {
    if (!_pbrCache[base]) {
        const cfg = (file, srgb) => {
            const t = _texLoader.load(`assets/textures/${base}_${file}.webp`)
            t.wrapS = t.wrapT = THREE.RepeatWrapping
            t.anisotropy = _maxAniso
            if (srgb) t.colorSpace = THREE.SRGBColorSpace
            return t
        }
        const arm = cfg('arm', false)
        _pbrCache[base] = {
            map: cfg('diff', true),
            normalMap: cfg('nor_gl', false),
            roughnessMap: arm,
            metalnessMap: arm
        }
    }
    const s = _pbrCache[base]
    ;[s.map, s.normalMap, s.roughnessMap].forEach(t => t.repeat.set(rx, ry))
    return { ...s }
}

function construirEntorno() {
    const grupo = new THREE.Group()
    crearSalaTaller(grupo)
    crearLucesTecho(grupo)
    crearBanco(grupo)
    crearTapete(grupo)
    // El pegboard procedural se reemplaza por el panel de herramientas real
    // (tool_storage_board) en cargarPropsTaller, en el mismo hueco de pared.
    crearEstanteria(grupo, SALA.xMin + 0.32, -1.6, Math.PI / 2)
    crearEstanteria(grupo, SALA.xMax - 0.32, -0.6, -Math.PI / 2)
    crearDecoracionPared(grupo)
    crearVentana(grupo)
    crearPantallaTaller(grupo)
    crearPlantas(grupo)
    crearSombraContacto(grupo)
    crearProps(grupo)
    scene.add(grupo)

    grupo.updateWorldMatrix(true, true)
    grupo.traverse(o => { o.matrixAutoUpdate = false })

    const vitrina = new THREE.Group()
    crearVitrinaComponentes(vitrina)
    scene.add(vitrina)

    cargarPropsTaller()
}

const RUTA_PROP = 'assets/3d_models/'

// Carga un .glb de utilería del taller: lo escala a `size` (por su dimensión
// mayor), centra su geometría, apoya la base en `y` (piso por defecto), aplica
// sombras/anisotropía, reproduce en bucle sus animaciones (fans, etc.) y —si se
// pasa `fact`— lo hace interactivo (el dron comenta al hacer clic). Las
// posiciones son aproximadas: se pueden afinar por consola con `__lab.props`.
function cargarProp(archivo, opts = {}) {
    const {
        size = 1, x = 0, z = 0, y = SALA.y0, rotY = 0, rotX = 0,
        fact = null, id = null, anim = true, centroY = null, onReady = null, onClic = null
    } = opts
    crearGLTFLoader().load(RUTA_PROP + archivo, (gltf) => {
        const inner = gltf.scene
        let box = new THREE.Box3().setFromObject(inner)
        const dim = box.getSize(new THREE.Vector3())
        const s = size / (Math.max(dim.x, dim.y, dim.z) || 1)
        inner.scale.setScalar(s)
        box = new THREE.Box3().setFromObject(inner)
        inner.position.sub(box.getCenter(new THREE.Vector3()))   // geometría al origen
        const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5)
        optimizarMateriales(inner)

        const g = new THREE.Group()
        g.add(inner)
        g.rotation.set(rotX, rotY, 0)
        g.position.set(x, centroY != null ? centroY : y + half.y, z)
        scene.add(g)

        if (anim && gltf.animations?.length) {
            const mixer = new THREE.AnimationMixer(inner)
            gltf.animations.forEach(cl => mixer.clipAction(cl).play())
            mixers.push(mixer)
        }
        if (onClic) g.userData.onClic = onClic
        if (fact || onClic) { if (fact) g.userData.fact = fact; propsInteractivos.push(g) }
        if (id) propsTaller[id] = g
        pedirActualizarSombras()
        if (onReady) onReady(g, half)
    }, undefined, () => appendLog(`Prop del taller no disponible: ${archivo}`, 'system'))
}

// Plano del taller (top-down). Sala: X[-5,5] (izq→der), Z[-4,5] (frente→fondo),
// piso y=-1.0, superficie del escritorio y=0. Mesa de ensamble al centro (origen);
// vitrina de componentes en la pared del fondo (z≈+4.7). Coordenadas deliberadas
// para que nada se solape; se afinan por consola con `__lab.setProp(id, {...})`.
function cargarPropsTaller() {
    // ── Almacén: estantería de repuestos contra la pared izquierda, al fondo
    //    (después de la ventana, sin pisar la planta ni la estantería procedural).
    cargarProp('basket_shelving_for_store_or_warehouse.opt.glb', {
        id: 'shelving', size: 2.4, x: -4.4, z: 3.4, rotY: Math.PI / 2,
        fact: 'Estantería de repuestos: aquí guardamos componentes y cajas del taller.'
    })

    // ── Estación de pruebas contra la pared derecha (banco + periféricos).
    montarEstacionPruebas()

    // ── Taburete del técnico, frente a la mesa de ensamble.
    cargarProp('bar_stool.opt.glb', {
        id: 'stool', size: 1.05, x: 2.5, z: 2.6,
        fact: 'Taburete del técnico. Trabajar a la altura correcta evita forzar los cables.'
    })

    // ── Panel de herramientas real en la pared frontal (reemplaza el pegboard
    //    procedural, en el mismo hueco: ancho ~2.5, centrado en x=-1.4).
    cargarProp('tool_storage_board.opt.glb', {
        id: 'toolboard', size: 2.5, x: -1.4, z: -3.9, rotY: Math.PI / 2, centroY: 1.0,
        fact: 'Panel de herramientas: destornilladores, pinzas y llaves siempre a mano.'
    })

    // ── Decoración viva: dos ventiladores RGB girando en el borde trasero de la
    //    mesa (piezas de repuesto), lejos de la zona de ensamble.
    cargarProp('rgb_pc_fan.opt.glb', {
        id: 'fan1', size: 0.26, x: -0.95, z: -0.78, y: 0, rotY: 0.25,
        fact: 'Ventilador RGB de repuesto: sus aspas mueven el aire para refrigerar el gabinete.'
    })
    cargarProp('rgb_fan.opt.glb', { id: 'fan2', size: 0.26, x: 0.95, z: -0.78, y: 0 })

    // Fase 2A: SSD desarmable + herramientas interactivas.
    cargarSSDTeardown()
    cargarHerramientas()
}

// SSD de 2.5" desarmable: al hacer clic (o E al caminar) reproduce su despiece
// —carcasa, PCB con controlador, chips NAND y tornillos— y al volver a pulsar se
// rearma. Es un "mira por dentro" educativo. No se auto-reproduce: el clip se
// controla por tiempo desde animar() según ssdProg→ssdTarget.
function cargarSSDTeardown() {
    crearGLTFLoader().load(RUTA_PROP + 'ssd_solid-state_drive.opt.glb', (gltf) => {
        const inner = gltf.scene
        let box = new THREE.Box3().setFromObject(inner)
        const dim = box.getSize(new THREE.Vector3())
        inner.scale.setScalar(0.42 / (Math.max(dim.x, dim.y, dim.z) || 1))
        box = new THREE.Box3().setFromObject(inner)
        inner.position.sub(box.getCenter(new THREE.Vector3()))
        const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5)
        optimizarMateriales(inner)

        const g = new THREE.Group()
        g.add(inner)
        g.rotation.y = 0.4
        g.position.set(1.05, half.y, 0.55)          // apoyado en la mesa (y=0)
        g.userData.onClic = toggleSSDTeardown
        g.userData.fact = 'SSD de 2.5": haz clic para desarmarlo y ver sus capas por dentro.'
        scene.add(g)
        propsInteractivos.push(g)
        propsTaller.ssd = g

        // Recolectamos las 4 capas (carcasa sup., PCB, tornillos, carcasa inf.) y
        // guardamos su posición de reposo. El despiece las separa hacia arriba en
        // el eje local Y, escalonadas, según ssdProg.
        const orden = ['SSD_Case_1', 'SSD_Board', 'SSD_Screws', 'SSD_Case_2']
        const nodos = {}
        inner.traverse(o => { if (orden.includes(o.name)) nodos[o.name] = o })
        ssdPartes = orden.filter(n => nodos[n]).map((n, i) => ({
            nodo: nodos[n], rest: nodos[n].position.clone(), sep: i * 2.6
        }))
        aplicarTeardownSSD(0)

        pedirActualizarSombras()
        appendLog('SSD de inspección listo: haz clic para desarmarlo.', 'success')
    }, undefined, () => appendLog('SSD de inspección no disponible.', 'system'))
}

// Coloca cada capa del SSD en rest + separación·prog a lo largo del eje local Y.
function aplicarTeardownSSD(prog) {
    if (!ssdPartes) return
    for (const p of ssdPartes) p.nodo.position.set(p.rest.x, p.rest.y + p.sep * prog, p.rest.z)
}

function toggleSSDTeardown() {
    if (!ssdPartes) return
    ssdTarget = ssdTarget > 0.5 ? 0 : 1
    const abriendo = ssdTarget > 0.5
    LFSound.click()
    droneHabla(abriendo
        ? 'Mira un SSD por dentro: la carcasa, la placa PCB con el controlador y los chips de memoria NAND, y los tornillos que lo cierran. ¡Sin partes móviles!'
        : 'Lo armamos de nuevo. Al no tener partes móviles, un SSD es silencioso y resiste golpes mucho mejor que un disco duro.')
    setHint(abriendo
        ? '<strong>SSD desarmado</strong> — carcasa · PCB + controlador · chips NAND · tornillos. Clic para armarlo de nuevo.'
        : '<strong>SSD armado.</strong> Clic para desarmarlo otra vez.')
    appendLog(abriendo ? 'SSD desarmado para inspección.' : 'SSD rearmado.', 'info')
}

// Herramientas reales del taller como props interactivos (clic → el dron explica
// su uso). Colocadas alrededor de la mesa y el banco.
function cargarHerramientas() {
    cargarProp('phillips_screwdriver..opt.glb', {
        id: 'screwdriver', size: 0.36, x: -0.7, z: 0.7, y: 0, rotY: 0.5,
        fact: 'Destornillador Phillips #2: la herramienta esencial para armar un PC. Si es imantado, sujeta los tornillos y evita que caigan dentro del gabinete.'
    })
    cargarProp('syringe.opt.glb', {
        id: 'paste', size: 0.3, x: -0.35, z: 0.85, y: 0, rotY: -0.4,
        fact: 'Pasta térmica: se aplica una gota del tamaño de un guisante sobre el CPU. Rellena los microporos y conduce el calor al disipador.',
        onClic: clicPastaTermica
    })
    cargarProp('cc0_-_wooden_spatula.opt.glb', {
        id: 'spatula', size: 0.16, x: -0.15, z: 0.9, y: 0, rotY: 0.8,
        fact: 'Espátula: sirve para esparcir la pasta térmica de forma uniforme, aunque muchos prefieren dejar que la presión del disipador la reparta.'
    })
    cargarProp('clean_paint_brush.opt.glb', {
        id: 'brush', size: 0.34, x: 0.25, z: 0.85, y: 0, rotY: -0.7,
        fact: 'Brocha antiestática: para limpiar el polvo de ventiladores y disipadores. El polvo es el enemigo nº1 de la temperatura.'
    })
    cargarProp('fluck__probs.opt.glb', {
        id: 'multimeter', size: 0.5, x: 3.62, z: 2.72, y: -0.01, rotY: -Math.PI / 2,
        fact: 'Multímetro: mide voltajes para diagnosticar la fuente y detectar componentes dañados. Clave en la estación de diagnóstico.',
        onClic: clicMultimetro
    })
}

// Banco de pruebas con periféricos encima. Se agranda a un tamaño comparable a la
// mesa central (antes era mucho más pequeño y todo se encimaba) y a la altura de un
// escritorio real. El banco va contra la pared derecha con su lado largo paralelo a
// la pared (rotY=0); todos los periféricos miran hacia el centro (rotY=-90°). La
// altura real de la superficie se calcula en onReady para apoyar todo sin adivinar.
// Distribución (X = profundidad hacia la sala, mayor X = fondo junto a la pared):
//   · monitor al fondo-centro   · teclado y ratón al frente   · la PC a un lado
//     (hacia -Z) para que la torre NUNCA atraviese el monitor ni el teclado.
function montarEstacionPruebas() {
    const wbX = 4.1, wbZ = 1.9, faceCentro = -Math.PI / 2
    cargarProp('workbench_low-poly.opt.glb', {
        id: 'workbench', size: 2.7, x: wbX, z: wbZ, rotY: 0,
        fact: 'Banco de pruebas: aquí se enciende la PC terminada para su primer arranque (POST).',
        onReady: (g, half) => {
            const topY = g.position.y + half.y
            // Guarda la estación (centro/altura) para posar la PC y trazar el cable.
            bancoPruebas = { x: wbX, z: wbZ, topY }
            // Zona de posado de la PC: al costado del monitor (hacia -Z), bien dentro
            // del banco. La Y se calcula al posar (alturaBaseBanco) según su altura.
            // ry=π orienta el gabinete con su cara visible (cristal/componentes) hacia
            // la persona (-X); con ry=0 quedaba al revés (frente hacia la pared).
            pcBancoCfg = { x: 4.28, z: 1.02, ry: Math.PI }
            cargarProp('pc_monitor.opt.glb', {
                id: 'monitor', size: 1.25, x: 4.42, z: 2.08, y: topY, rotY: faceCentro, anim: false,
                fact: 'Monitor de pruebas: muestra el POST/BIOS cuando la PC arranca por primera vez.',
                onReady: (mg, mHalf) => crearPantallaPC(mg, mHalf)
            })
            cargarProp('keyboard.opt.glb', {
                id: 'keyboard', size: 0.78, x: 3.66, z: 2.08, y: topY, rotY: faceCentro, anim: false,
                fact: 'Teclado de diagnóstico: con Supr o F2 se entra a la BIOS.'
            })
            cargarProp('mouse.opt.glb', {
                id: 'mouse', size: 0.17, x: 3.66, z: 2.68, y: topY, rotY: faceCentro,
                fact: 'Mouse de pruebas.'
            })
            cargarProp('desk_lamp.opt.glb', {
                id: 'lamp', size: 0.55, x: 4.45, z: 3.02, y: topY, rotY: faceCentro,
                fact: 'Lámpara de banco: buena luz para no equivocarse al conectar cables pequeños.'
            })
            // El multímetro (herramienta de diagnóstico) se apoya en este banco: se
            // recoloca aquí, a la altura real de la superficie, para que no quede
            // hundido al cambiar el tamaño del banco.
            const mm = propsTaller.multimeter
            if (mm) mm.position.set(3.62, topY, 2.72)
        }
    })
}

// ── Pantalla del monitor de la estación de pruebas ──────────────────────────
// Plano con CanvasTexture (mismo patrón que la pantalla de pared del taller),
// hijo del grupo del monitor. El monitor está rotado para mirar al centro de la
// sala, así que el +Z local del plano queda de cara al espectador. Las medidas
// son aproximadas: se calibran en vivo con `__lab.setPantallaPC({...})`.
function crearPantallaPC(monitorGrp, half) {
    pantallaPCcanvas = document.createElement('canvas')
    pantallaPCcanvas.width = 512
    pantallaPCcanvas.height = 320
    pantallaPCtex = new THREE.CanvasTexture(pantallaPCcanvas)
    pantallaPCtex.colorSpace = THREE.SRGBColorSpace

    // El plano se apoya sobre el cristal del monitor, justo delante de su cara frontal
    // (half.z * 1.03 ≈ 8 mm por delante para evitar z-fighting, no flota de lado). El
    // alto es MENOR que half.y*2 porque ese bounding incluye la peana: se recorta a la
    // zona de pantalla y se sube (y = half.y*0.36) para quedar dentro del bisel.
    pantallaPCmesh = new THREE.Mesh(
        new THREE.PlaneGeometry(half.x * 1.34, half.y * 1.10),
        new THREE.MeshBasicMaterial({ map: pantallaPCtex })
    )
    pantallaPCmesh.position.set(0, half.y * 0.36, half.z * 1.03)
    monitorGrp.add(pantallaPCmesh)
    dibujarPantallaPC()   // estado "apagado/en espera"
}

// Calibración por consola del plano de la pantalla (posición/tamaño relativos
// al grupo del monitor).
function setPantallaPC(cfg = {}) {
    if (!pantallaPCmesh) return
    if (cfg.w != null || cfg.h != null) {
        const p = pantallaPCmesh.geometry.parameters
        pantallaPCmesh.geometry.dispose()
        pantallaPCmesh.geometry = new THREE.PlaneGeometry(cfg.w ?? p.width, cfg.h ?? p.height)
    }
    const q = pantallaPCmesh.position
    pantallaPCmesh.position.set(cfg.x ?? q.x, cfg.y ?? q.y, cfg.z ?? q.z)
    if (cfg.flip) pantallaPCmesh.rotation.y += Math.PI
    dibujarPantallaPC()
    if (renderer) renderer.render(scene, camera)
}

// Lista de objetos raycasteables que representan la PC ensamblada (para
// apuntarle con la mira y agarrarla).
function pcPickList() {
    if (pcCarryGrp) return [pcCarryGrp]
    return PASOS.map(p => modelos3D[p.id]).filter(g => g && g.visible)
}

// Guía visible del mini-flujo de pruebas (usa el panel lateral, no un toast que
// tape el 3D — coherente con la retirada de notificaciones flotantes).
function guiaBanco(titulo, texto) {
    const t = document.getElementById('mission-title')
    const i = document.getElementById('instruction-p')
    if (t && titulo) t.textContent = titulo
    if (i && texto) i.textContent = texto
}

// Levanta la PC ensamblada: reagrupa todas las piezas en `pcCarryGrp` centrado
// en el origen del grupo, para poder cargarla y rotarla cómodamente.
function agarrarPC() {
    if (pcCargando || fase !== '3d') return
    limpiarCablePC()
    bootPC = null
    dibujarPantallaPC()   // apaga la pantalla del monitor (SIN SEÑAL)

    if (!pcCarryGrp) {
        pcCarryGrp = new THREE.Group()
        scene.add(pcCarryGrp)
        PASOS.forEach(p => {
            const g = modelos3D[p.id]
            if (g && g.visible) pcCarryGrp.attach(g)   // conserva transform mundial
        })
        // Recentra los hijos alrededor del origen del grupo y guarda su "casa"
        // (el sitio en la mesa) para poder devolverla.
        const c = new THREE.Box3().setFromObject(pcCarryGrp).getCenter(new THREE.Vector3())
        pcCarryGrp.children.forEach(ch => ch.position.sub(c))
        pcCarryGrp.position.copy(c)
        pcCarryGrp.userData.homePos = c.clone()
        // Semialtura (a escala 1) para apoyar la base al posarla en el banco.
        pcCarryGrp.updateWorldMatrix(true, true)
        const s0 = pcCarryGrp.scale.x
        pcCarryGrp.scale.setScalar(1)
        pcCarryGrp.userData.halfY = new THREE.Box3().setFromObject(pcCarryGrp).getSize(new THREE.Vector3()).y / 2
        pcCarryGrp.scale.setScalar(s0)
    }
    pcTween = null
    pcCargando = true
    pcEnBanco = false
    pcCarryGrp.scale.setScalar(PC_CARRY_S)
    LFSound.snap()
    guiaBanco('Prueba de arranque', 'Llevas la PC ensamblada. Camina hasta el banco de pruebas (pared derecha), apúntalo con la mira y pulsa E para conectarla al monitor. Q para dejarla.')
}

// Cancela la carga: devuelve la PC a su sitio en la mesa central.
function devolverPCaMesa() {
    if (!pcCargando || !pcCarryGrp) return
    pcCargando = false
    pcEnBanco = false
    const home = pcCarryGrp.userData.homePos || new THREE.Vector3(0, 1.1, 0)
    pcTween = { fromPos: pcCarryGrp.position.clone(), toPos: home.clone(),
                fromRY: pcCarryGrp.rotation.y, toRY: 0,
                fromS: pcCarryGrp.scale.x, toS: 1, t: 0, dur: 0.7, alBanco: false }
    guiaBanco('¡PC ensamblada con éxito!', 'Dejaste la PC en la mesa. Puedes volver a levantarla (E) para probarla en el banco.')
}

// Altura del origen de la PC para que su base quede apoyada en el banco.
function alturaBaseBanco() {
    const topY = bancoPruebas ? bancoPruebas.topY : 0
    const halfY = (pcCarryGrp && pcCarryGrp.userData.halfY) || 0.85
    return topY + halfY * PC_BANCO_S + 0.01
}

// Posa la PC sobre el banco de pruebas y lanza el arranque.
function colocarPCEnBanco() {
    if (!pcCargando || !pcCarryGrp || !pcBancoCfg) return
    pcCargando = false
    pcEnBanco = true
    pcTween = {
        fromPos: pcCarryGrp.position.clone(),
        toPos: new THREE.Vector3(pcBancoCfg.x, alturaBaseBanco(), pcBancoCfg.z),
        fromRY: pcCarryGrp.rotation.y, toRY: pcBancoCfg.ry,
        fromS: pcCarryGrp.scale.x, toS: PC_BANCO_S,
        t: 0, dur: 0.85, alBanco: true
    }
    LFSound.snap()
    guiaBanco('Conectando al monitor…', 'La PC queda sobre el banco de pruebas. Conectando alimentación y video…')
}

// Cable simple PC→monitor (curva descendente entre ambos).
function crearCablePC() {
    limpiarCablePC()
    if (!bancoPruebas || !pcCarryGrp) return
    const a = pcCarryGrp.position.clone()
    a.x += 0.12; a.y += 0.05
    const b = new THREE.Vector3(bancoPruebas.x + 0.02, bancoPruebas.topY + 0.05, bancoPruebas.z)
    const mid = a.clone().lerp(b, 0.5); mid.y -= 0.14
    const curva = new THREE.QuadraticBezierCurve3(a, mid, b)
    cablePC = new THREE.Mesh(
        new THREE.TubeGeometry(curva, 20, 0.012, 6, false),
        new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.6, metalness: 0.2 })
    )
    scene.add(cablePC)
}

function limpiarCablePC() {
    if (cablePC) { scene.remove(cablePC); cablePC.geometry.dispose(); cablePC.material.dispose(); cablePC = null }
}

// Arranca la PC en el monitor: la secuencia depende de si el ensamble aprobó.
function arrancarPC() {
    const aprobado = notaFinalSesion >= NOTA_MINIMA
    bootPC = { inicio: performance.now(), aprobado, beep: false, chime: false }
    crearCablePC()
    guiaBanco(
        aprobado ? '¡La PC enciende!' : 'Arranque con error',
        aprobado
            ? 'Pulsaste encender: POST correcto → BIOS → el sistema arranca. Observa el video en el monitor.'
            : 'El POST falla y el monitor muestra un error: el ensamble no cumple el mínimo. Repasa el orden y las piezas, y vuelve a probar.'
    )

    // Persistencia: registra la prueba de arranque en la BD una sola vez por sesión.
    if (!pruebaArranqueGuardada) {
        pruebaArranqueGuardada = true
        registrarEvento({
            tipo: aprobado ? 'prueba_arranque_ok' : 'prueba_arranque_fallo',
            detalle: aprobado ? 'POST correcto en el banco de pruebas' : 'POST con error en el banco de pruebas'
        })
        marcarPruebaArranque({ exito: aprobado }).catch(() => {})
    }

    // Prueba obligatoria: al terminar la secuencia de arranque en el monitor se
    // cierra la simulación con el resumen (aprobado o no). Los arranques posteriores
    // (al explorar el taller) ya no reabren el resumen.
    if (pruebaFinalPendiente) {
        pruebaFinalPendiente = false
        const espera = aprobado ? 4600 : 3000   // deja ver el POST→escritorio o el POST ERROR
        setTimeout(() => { if (fase === '3d') mostrarFinal() }, espera)
    }
}

// Dibuja un fotograma del arranque en el monitor según el tiempo transcurrido.
function dibujarPantallaPC() {
    if (!pantallaPCcanvas) return
    const c = pantallaPCcanvas
    const ctx = c.getContext('2d')
    const W = c.width, H = c.height

    if (!bootPC) {                    // monitor en espera (apagado)
        ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#1c2733'; ctx.font = '16px "Segoe UI", sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('SIN SEÑAL', W / 2, H / 2)
        pantallaPCtex.needsUpdate = true
        return
    }

    const el = (performance.now() - bootPC.inicio) / 1000
    ctx.textBaseline = 'alphabetic'

    if (!bootPC.aprobado) {
        // Arranque fallido: intento de POST y pantalla de error.
        ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, W, H)
        if (el < 1.1) {
            if (!bootPC.beep && el > 0.25) { bootPC.beep = true; LFSound.beep(); setTimeout(() => LFSound.beep(), 180); setTimeout(() => LFSound.beep(), 360) }
            ctx.fillStyle = '#8fa5bd'; ctx.font = '15px monospace'; ctx.textAlign = 'left'
            ctx.fillText('LogicFlow BIOS  —  autotest de encendido (POST)', 22, 40)
            ctx.fillText('Detectando hardware' + '.'.repeat(1 + (Math.floor(el * 3) % 3)), 22, 70)
        } else {
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, W - 20, H - 20)
            ctx.textAlign = 'center'
            ctx.fillStyle = '#ef4444'; ctx.font = 'bold 42px "Segoe UI", sans-serif'
            ctx.fillText('POST ERROR', W / 2, 110)
            ctx.fillStyle = '#eaf2ff'; ctx.font = '17px monospace'
            ctx.fillText('Sistema inestable — el ensamble no cumple el estándar', W / 2, 158)
            ctx.fillStyle = '#f59e0b'; ctx.font = '15px monospace'
            ctx.fillText('Codigo: 0x' + (0xE00 + erroresSesion).toString(16).toUpperCase() + '   Errores: ' + erroresSesion, W / 2, 196)
            ctx.fillStyle = '#8fa5bd'; ctx.font = '14px "Segoe UI", sans-serif'
            ctx.fillText('Revisa el orden y la elección de piezas, y vuelve a probar.', W / 2, 240)
            // cursor parpadeante
            if (Math.floor(el * 2) % 2 === 0) { ctx.fillStyle = '#ef4444'; ctx.fillRect(W / 2 - 130, 270, 10, 18) }
        }
        pantallaPCtex.needsUpdate = true
        return
    }

    // ── Arranque exitoso ──
    if (el < 2.4) {
        // POST: logo + conteo de memoria + componentes detectados.
        ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, W, H)
        if (!bootPC.beep && el > 0.25) { bootPC.beep = true; LFSound.beep() }
        ctx.textAlign = 'left'
        ctx.font = 'bold 26px "Segoe UI", sans-serif'
        ctx.fillStyle = '#3a8bff'; ctx.fillText('Logic', 22, 44)
        ctx.fillStyle = '#eaf2ff'; ctx.fillText('Flow BIOS  v1.1', 22 + ctx.measureText('Logic').width, 44)
        ctx.font = '14px monospace'; ctx.fillStyle = '#8fa5bd'
        const mem = Math.min(16384, Math.floor((el / 1.4) * 16384))
        ctx.fillText(`Memoria: ${mem} MB  OK`, 22, 78)
        ctx.fillStyle = '#4ade80'
        const nDet = Math.min(PASOS.length, Math.floor(el / 0.16))
        for (let i = 0; i < nDet; i++) {
            ctx.fillText('  ✓ ' + PASOS[i].nombre + ' detectado', 22, 104 + i * 17)
        }
    } else if (el < 3.3) {
        // Transición: cargando sistema.
        ctx.fillStyle = '#0b1524'; ctx.fillRect(0, 0, W, H)
        ctx.textAlign = 'center'
        ctx.font = 'bold 28px "Segoe UI", sans-serif'; ctx.fillStyle = '#3a8bff'
        ctx.fillText('LogicFlow OS', W / 2, H / 2 - 20)
        ctx.fillStyle = '#8fa5bd'; ctx.font = '15px "Segoe UI", sans-serif'
        ctx.fillText('Iniciando el sistema…', W / 2, H / 2 + 12)
        const a = (el - 2.4) / 0.9
        ctx.strokeStyle = '#1e2b3d'; ctx.lineWidth = 4
        ctx.beginPath(); ctx.arc(W / 2, H / 2 + 52, 16, 0, Math.PI * 2); ctx.stroke()
        ctx.strokeStyle = '#3a8bff'
        ctx.beginPath(); ctx.arc(W / 2, H / 2 + 52, 16, el * 6, el * 6 + Math.PI * 1.4); ctx.stroke()
    } else {
        // Escritorio con "video" en bucle.
        if (!bootPC.chime) { bootPC.chime = true; LFSound.complete() }
        dibujarEscritorioPC(ctx, W, H, el - 3.3)
    }
    pantallaPCtex.needsUpdate = true
}

// Escritorio animado del sistema arrancado: fondo, ventana de "video" con una
// forma de onda que reacciona, barra de tareas y reloj de sesión.
function dibujarEscritorioPC(ctx, W, H, t) {
    // Fondo degradado
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#0e2038'); grad.addColorStop(1, '#0a1424')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)

    // Ventana de reproductor de video
    const vx = 40, vy = 34, vw = W - 80, vh = H - 110
    ctx.fillStyle = '#050a12'; ctx.fillRect(vx, vy, vw, vh)
    ctx.strokeStyle = '#1e3550'; ctx.lineWidth = 2; ctx.strokeRect(vx, vy, vw, vh)
    // Barra de título del reproductor
    ctx.fillStyle = '#12233c'; ctx.fillRect(vx, vy, vw, 22)
    ctx.fillStyle = '#7fd4ff'; ctx.font = '12px "Segoe UI", sans-serif'; ctx.textAlign = 'left'
    ctx.fillText('▶ LogicFlow — demo de video', vx + 10, vy + 15)

    // Forma de onda animada (el "video")
    ctx.save()
    ctx.beginPath(); ctx.rect(vx, vy + 22, vw, vh - 22); ctx.clip()
    const cy = vy + 22 + (vh - 22) / 2
    ctx.lineWidth = 3
    for (let b = 0; b < 3; b++) {
        ctx.strokeStyle = ['#3a8bff', '#7fd4ff', '#4ade80'][b]
        ctx.globalAlpha = 0.85 - b * 0.22
        ctx.beginPath()
        for (let x = 0; x <= vw; x += 6) {
            const y = cy + Math.sin(x * 0.03 + t * 3 + b * 1.2) * (26 + 14 * Math.sin(t * 1.3 + b)) * Math.sin(x / vw * Math.PI)
            x === 0 ? ctx.moveTo(vx + x, y) : ctx.lineTo(vx + x, y)
        }
        ctx.stroke()
    }
    ctx.globalAlpha = 1
    // Logo pulsante al centro del video
    const pr = 20 + Math.sin(t * 2.4) * 3
    ctx.fillStyle = 'rgba(58,139,255,0.16)'
    ctx.beginPath(); ctx.arc(vx + vw / 2, cy, pr + 12, 0, Math.PI * 2); ctx.fill()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = 'bold 22px "Segoe UI", sans-serif'; ctx.fillStyle = '#eaf2ff'
    ctx.fillText('LF', vx + vw / 2, cy)
    ctx.textBaseline = 'alphabetic'
    ctx.restore()

    // Barra de tareas
    ctx.fillStyle = '#0a1220'; ctx.fillRect(0, H - 34, W, 34)
    ctx.fillStyle = '#3a8bff'; ctx.beginPath(); ctx.arc(24, H - 17, 9, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#eaf2ff'; ctx.font = 'bold 12px "Segoe UI", sans-serif'; ctx.textAlign = 'left'
    ctx.fillText('LF', 20, H - 13)
    ctx.fillStyle = '#4ade80'; ctx.font = '13px "Segoe UI", sans-serif'
    ctx.fillText('● Sistema estable', 48, H - 13)
    // Reloj de sesión
    const total = Math.floor(t)
    const mm = String(Math.floor(total / 60)).padStart(2, '0')
    const ss = String(total % 60).padStart(2, '0')
    ctx.textAlign = 'right'; ctx.fillStyle = '#8fa5bd'
    ctx.fillText(`${mm}:${ss}`, W - 16, H - 13)
}

function crearSalaTaller(grupo) {
    const { xMin, xMax, zMin, zMax, y0, h } = SALA
    const W = xMax - xMin, D = zMax - zMin
    const cx = (xMin + xMax) / 2, cz = (zMin + zMax) / 2
    const top = y0 + h

    const suelo = new THREE.Mesh(
        new THREE.PlaneGeometry(W, D),
        new THREE.MeshStandardMaterial({
            ...pbrTaller('floor', W / 3.2, D / 3.2),
            color: 0xffffff, roughness: 1, metalness: 1
        })
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
    const pared = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({
            ...pbrTaller('wall', Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 3))),
            color: 0xf2efe9, roughness: 1, metalness: 0, side: THREE.DoubleSide
        })
    )
    pared.position.set(pos[0], pos[1], pos[2])
    pared.rotation.y = rotY
    pared.receiveShadow = true
    grupo.add(pared)
}


function crearLucesTecho(grupo) {

    const top = SALA.y0 + SALA.h
    const marcoMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.6, roughness: 0.4 })
    const tuboMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 1.8 })
    ;[[-2, -1], [2, -1], [0, 2.2]].forEach(([x, z]) => {
        const marco = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.5), marcoMat)
        marco.position.set(x, top - 0.04, z); grupo.add(marco)
        const tubo = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.4), tuboMat)
        tubo.position.set(x, top - 0.105, z); grupo.add(tubo)
    })
    const luz = new THREE.PointLight(0xfff3df, 4.5, 12, 1.8)
    luz.position.set(0, top - 0.4, 0.4)
    grupo.add(luz)
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
    poster.userData.fact = 'Un plano de placa base ATX: el estándar de tamaño más usado desde 1995. ¡Casi 30 años y sigue vigente!'
    grupo.add(poster)
    propsInteractivos.push(poster)

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
    reloj.userData.fact = 'Tic, tac… Un ensamblador con práctica arma un PC completo en menos de 30 minutos. ¡Tómate tu tiempo para aprender!'
    grupo.add(reloj)
    propsInteractivos.push(reloj)

    const cartel = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 0.55),
        new THREE.MeshStandardMaterial({ map: crearTexturaCartel(), emissive: 0xffffff, emissiveMap: crearTexturaCartel(), emissiveIntensity: 0.6, roughness: 0.6 })
    )
    cartel.position.set(-1.4, 2.25, zBack)
    grupo.add(cartel)
}

function crearVentana(grupo) {
    const g = new THREE.Group()
    const marcoMat = new THREE.MeshStandardMaterial({ color: 0x30363e, metalness: 0.55, roughness: 0.4 })

    const W = 2.0, H = 1.15
    const cielo = new THREE.Mesh(
        new THREE.PlaneGeometry(W, H),
        new THREE.MeshBasicMaterial({ map: crearTexturaCielo() })
    )
    g.add(cielo)

    const mT = new THREE.Mesh(new THREE.BoxGeometry(W + 0.12, 0.07, 0.07), marcoMat)
    mT.position.y = H / 2 + 0.02; g.add(mT)
    const mB = mT.clone(); mB.position.y = -H / 2 - 0.02; g.add(mB)
    const mL = new THREE.Mesh(new THREE.BoxGeometry(0.07, H + 0.12, 0.07), marcoMat)
    mL.position.x = -W / 2 - 0.02; g.add(mL)
    const mR = mL.clone(); mR.position.x = W / 2 + 0.02; g.add(mR)
    const cruceta = new THREE.Mesh(new THREE.BoxGeometry(0.05, H, 0.05), marcoMat)
    g.add(cruceta)
    const crucetaH = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, 0.05), marcoMat)
    g.add(crucetaH)

    const repisa = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.05, 0.16), marcoMat)
    repisa.position.set(0, -H / 2 - 0.08, 0.05); g.add(repisa)

    g.position.set(SALA.xMin + 0.045, SALA.y0 + 2.0, 1.6)
    g.rotation.y = Math.PI / 2
    g.userData.fact = 'Por la ventana entra luz natural. En un taller real conviene armar el PC lejos de alfombras y con buena iluminación.'
    grupo.add(g)
    propsInteractivos.push(g)
}


let pantallaTallerCanvas = null
let pantallaTallerTex = null

function crearPantallaTaller(grupo) {
    const g = new THREE.Group()

    pantallaTallerCanvas = document.createElement('canvas')
    pantallaTallerCanvas.width = 512; pantallaTallerCanvas.height = 288
    pantallaTallerTex = new THREE.CanvasTexture(pantallaTallerCanvas)
    pantallaTallerTex.colorSpace = THREE.SRGBColorSpace
    dibujarPantallaTaller()

    const marco = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 1.0, 0.07),
        new THREE.MeshStandardMaterial({ color: 0x14171c, metalness: 0.5, roughness: 0.4 })
    )
    g.add(marco)
    const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.58, 0.88),
        new THREE.MeshBasicMaterial({ map: pantallaTallerTex })
    )
    screen.position.z = -0.038
    screen.rotation.y = Math.PI
    g.add(screen)

    g.position.set(SALA.xMax - 0.07, SALA.y0 + 2.05, 1.5)
    g.rotation.y = Math.PI / 2
    g.userData.fact = 'Esta pantalla muestra el estado del ensamblaje. ¡Así los técnicos llevan el control del protocolo!'
    grupo.add(g)
    propsInteractivos.push(g)
}

function dibujarPantallaTaller() {
    if (!pantallaTallerCanvas) return
    const c = pantallaTallerCanvas
    const ctx = c.getContext('2d')
    const paso = PASOS[indiceActual]

    ctx.fillStyle = '#0b1524'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.strokeStyle = 'rgba(58,139,255,0.55)'; ctx.lineWidth = 4
    ctx.strokeRect(6, 6, c.width - 12, c.height - 12)

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.font = 'bold 30px "Segoe UI", sans-serif'
    ctx.fillStyle = '#3a8bff'; ctx.fillText('Logic', 28, 52)
    ctx.fillStyle = '#eaf2ff'; ctx.fillText('Flow · Taller', 28 + ctx.measureText('Logic').width, 52)

    ctx.font = '17px "Segoe UI", sans-serif'; ctx.fillStyle = '#8fa5bd'
    ctx.fillText(modoReto ? 'MODO RETO · REPARACIÓN' : 'PROTOCOLO DE ENSAMBLE', 28, 92)

    if (modoReto) {
        ctx.font = 'bold 30px "Segoe UI", sans-serif'; ctx.fillStyle = '#ff9d4a'
        ctx.fillText(modoReto.reto.icono + ' ' + modoReto.reto.titulo, 28, 150)
        ctx.font = '20px "Segoe UI", sans-serif'; ctx.fillStyle = '#eaf2ff'
        ctx.fillText(modoReto.fase === 'reparacion' ? 'Falla diagnosticada: reemplaza la pieza' : 'Diagnóstico en curso…', 28, 190)
        pantallaTallerTex && (pantallaTallerTex.needsUpdate = true)
        return
    }

    if (paso) {
        ctx.font = 'bold 34px "Segoe UI", sans-serif'; ctx.fillStyle = '#ffd54a'
        ctx.fillText(`Paso ${indiceActual + 1}/${TOTAL}`, 28, 148)
        ctx.font = 'bold 26px "Segoe UI", sans-serif'; ctx.fillStyle = '#eaf2ff'
        ctx.fillText(paso.nombre, 28, 188)
    } else {
        ctx.font = 'bold 34px "Segoe UI", sans-serif'; ctx.fillStyle = '#4ade80'
        ctx.fillText('✓ Sistema completo', 28, 158)
    }

    const pct = Math.min(1, indiceActual / TOTAL)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(28, 224, c.width - 56, 22)
    ctx.fillStyle = pct >= 1 ? '#4ade80' : '#3a8bff'
    ctx.fillRect(28, 224, (c.width - 56) * pct, 22)

    pantallaTallerTex && (pantallaTallerTex.needsUpdate = true)
}

function crearPlantas(grupo) {
    const hoja = new THREE.MeshStandardMaterial({ color: 0x3f7a44, roughness: 0.85, flatShading: true })
    const hoja2 = new THREE.MeshStandardMaterial({ color: 0x4f9152, roughness: 0.85, flatShading: true })
    const potMat = new THREE.MeshStandardMaterial({ color: 0xa8552f, roughness: 0.7 })

    const mkPlanta = (x, z, s = 1) => {
        const g = new THREE.Group()
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.12 * s, 0.24 * s, 14), potMat)
        pot.position.y = 0.12 * s; pot.castShadow = true; g.add(pot)
        const tallo = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02 * s, 0.028 * s, 0.34 * s, 8),
            new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.9 })
        )
        tallo.position.y = 0.38 * s; g.add(tallo)
        ;[[0, 0.62, 0, 0.22], [0.13, 0.5, 0.06, 0.15], [-0.11, 0.52, -0.08, 0.16], [0.02, 0.5, -0.13, 0.14]].forEach(([px, py, pz, r], i) => {
            const bola = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), i % 2 ? hoja : hoja2)
            bola.position.set(px * s, py * s, pz * s)
            bola.castShadow = true
            g.add(bola)
        })
        g.position.set(x, SALA.y0, z)
        g.userData.fact = 'Una planta en el taller: el hardware prefiere ambientes sin polvo… ¡pero un poco de verde anima a cualquier técnico!'
        grupo.add(g)
        propsInteractivos.push(g)
    }
    // Esquina frontal izquierda (la estantería real ocupa el fondo izquierdo).
    mkPlanta(SALA.xMin + 0.7, SALA.zMin + 0.9, 1.4)
    mkPlanta(SALA.xMax - 0.65, SALA.zMin + 0.7, 1.2)
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

    crearGLTFLoader().load(
        'assets/3d_models/computer_desk/scene.opt.glb',
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

    const props = [
        [crearLampara(), 'La lámpara del técnico: una buena luz evita errores al conectar cables pequeños como los del panel frontal.'],
        [crearCajaHerramientas(), 'Caja de herramientas. Para armar un PC casi solo necesitas un destornillador Phillips #2… ¡y paciencia!'],
        [crearDestornillador(), 'Destornillador imantado: sujeta los tornillos y evita que caigan dentro del gabinete.'],
        [crearTaza(), '¡Cuidado con el café! Los líquidos y la electrónica son enemigos mortales. Mantenlo lejos de la mesa de trabajo.'],
        [crearBobinaCable(), 'Bridas y cables: una buena gestión de cables mejora el flujo de aire dentro del gabinete.']
    ]
    for (const [obj, fact] of props) {
        obj.userData.fact = fact
        grupo.add(obj)
        propsInteractivos.push(obj)
    }
}

// Las fábricas de props del taller (meshEntre, crearLampara,
// crearCajaHerramientas, crearDestornillador, crearTaza, crearBobinaCable)
// viven ahora en ./juego-props.js — se importan al inicio del módulo.

function construirIluminacion() {

    scene.add(new THREE.AmbientLight(0xffffff, 0.28))
    scene.add(new THREE.HemisphereLight(0xfff1d8, 0x55504a, 0.42))

    const key = new THREE.DirectionalLight(0xfff4e2, 1.6)
    key.position.set(2.5, 5, 3)
    key.castShadow = true
    key.shadow.mapSize.set(EQUIPO_MODESTO ? 1024 : 2048, EQUIPO_MODESTO ? 1024 : 2048)
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 14
    key.shadow.camera.left = -3; key.shadow.camera.right = 3
    key.shadow.camera.top = 3;   key.shadow.camera.bottom = -3
    key.shadow.bias = -0.0004
    scene.add(key)

    const fill = new THREE.DirectionalLight(0xcfe0f5, 0.45)
    fill.position.set(-3, 2.5, 2)
    scene.add(fill)

    const spot = new THREE.SpotLight(0xfff0dc, 3.2, 9, 0.62, 0.55, 1.4)
    spot.position.set(0, SALA.y0 + SALA.h - 0.3, VITRINA.frontZ - 1.7)
    spot.target.position.set(0, SALA.y0 + 1.4, VITRINA.backZ)
    scene.add(spot)
    scene.add(spot.target)
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
        // slotDiscs guarda el disco (no el grupo) para el raycasting de clics/E;
        // toda la visibilidad del marcador se controla vía grupo.visible en otros
        // ~15 sitios del archivo, así que replicamos ese valor aquí en vez de
        // exponer disco.visible como una propiedad independiente que podría
        // quedar en `true` mientras el marcador está oculto (raycaster.intersectObjects
        // consulta object.visible directamente sobre los elementos del array, sin
        // subir a comprobar la visibilidad de los ancestros).
        Object.defineProperty(disco, 'visible', {
            get: () => grupo.visible,
            set: v => { grupo.visible = v }
        })
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

const MAX_TEX_SIZE = 1024
let _maxAniso = 4

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
        // Si la malla no tiene un 2º set de UV (uv1), forzamos los mapas al canal 0:
        // algunos GLB del taller traen texCoord=1 en normal/AO sin TEXCOORD_1, lo que
        // rompe la compilación del shader ("uv1 undeclared identifier").
        const sinUv1 = !n.geometry?.attributes?.uv1
        const mats = Array.isArray(n.material) ? n.material : [n.material]
        mats.forEach(m => {
            if (!m) return
            claves.forEach(k => {
                const tex = m[k]
                if (!tex) return
                optimizarTextura(tex)
                if (sinUv1 && tex.channel === 1) { tex.channel = 0; m.needsUpdate = true }
            })
        })
    })
}

// Barrido de escena: en mallas sin 2º set de UV (uv1), fuerza al canal 0 cualquier
// mapa que apunte al canal 1. Cubre los meshes FUSIONADOS de la vitrina
// (fusionarMallasEstante), que se crean después de optimizarMateriales y pueden
// perder el uv1 dejando el normalMap en canal 1 → "uv1 undeclared" al compilar.
function sanearCanalesUv(root = scene) {
    if (!root) return
    const claves = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']
    root.traverse(n => {
        if (!n.isMesh || n.geometry?.attributes?.uv1) return
        const mats = Array.isArray(n.material) ? n.material : [n.material]
        mats.forEach(m => {
            if (!m) return
            claves.forEach(k => {
                if (m[k] && m[k].channel === 1) { m[k].channel = 0; m.needsUpdate = true }
            })
        })
    })
}

function precargarModelos() {
    const loader = crearGLTFLoader()
    appendLog('Cargando modelos 3D de hardware…', 'system')

    if (renderer) _maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy())

    let cargados = 0
    const total = PASOS.length
    setLoadingProgress(0, total)

    const safety = setTimeout(ocultarLoading, 30000)
    const marcarCargado = () => {
        cargados++
        setLoadingProgress(cargados, total)
        sanearCanalesUv()   // corrige el normalMap del mesh fusionado de la vitrina
        pedirActualizarSombras()
        if (cargados >= total) { clearTimeout(safety); ocultarLoading() }
    }

    let idx = 0
    const siguiente = () => {
        if (idx >= PASOS.length) return
        const paso = PASOS[idx++]

        // GLTFLoader/fetch no traen timeout propio: en una red que "cuelga" la
        // conexión sin cerrarla (wifi de laboratorio saturado, proxy que retiene
        // la petición) ni onLoad ni onError se disparan nunca, y como siguiente()
        // solo se re-invoca desde esos callbacks, TODOS los modelos restantes se
        // quedan sin cargar para siempre — la pantalla del reto/laboratorio parece
        // "colgada" cargando el simulador 3D. Igual que refreshSession() en
        // supabase-config.js, acotamos cada modelo con su propio timeout y caemos
        // al placeholder existente si se cumple, para que la cadena no se trabe.
        let resuelto = false
        const usarPlaceholder = () => {
            if (resuelto) return
            resuelto = true
            const ph = crearPlaceholder(paso)
            ph.visible = false
            scene.add(ph)
            modelos3D[paso.id] = ph
            appendLog(`Usando representación básica de ${paso.nombre}.`, 'system')
            if (PASOS.indexOf(paso) < indiceActual && !debeOcultarsePorReto(paso.id)) colocarModelo(paso, false)
            marcarCargado()
            siguiente()
        }
        const timeoutId = setTimeout(usarPlaceholder, MODEL_LOAD_TIMEOUT_MS)

        loader.load(
            paso.ruta,
            (gltf) => {
                if (resuelto) return
                resuelto = true
                clearTimeout(timeoutId)

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
                if (PASOS.indexOf(paso) < indiceActual && !debeOcultarsePorReto(paso.id)) colocarModelo(paso, false)
                marcarCargado()
                siguiente()
            },
            undefined,
            () => { clearTimeout(timeoutId); usarPlaceholder() }
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

    // Ahorro de GPU/batería: solo renderizamos cuando el laboratorio 3D está
    // realmente a la vista (no cubierto por los overlays de bienvenida/video/
    // quiz/final) y con la pestaña activa. Mantenemos el reloj al día para no
    // provocar un salto de delta al reanudar.
    if (fase !== '3d' || document.hidden) {
        relojWalk.getDelta()
        return
    }

    const t = performance.now() * 0.003
    const delta = relojWalk.getDelta()

    if (mixers.length) for (const m of mixers) m.update(delta)

    // Teardown del SSD: avanza suavemente ssdProg hacia ssdTarget (~1.1 s) y
    // reubica las capas.
    if (ssdPartes && ssdProg !== ssdTarget) {
        const d = Math.min(Math.abs(ssdTarget - ssdProg), delta / 1.1)
        ssdProg += Math.sign(ssdTarget - ssdProg) * d
        if (Math.abs(ssdTarget - ssdProg) < 0.001) ssdProg = ssdTarget
        aplicarTeardownSSD(ssdProg)
        pedirActualizarSombras()
    }

    PASOS.forEach(p => {
        if (p.marker && p.marker.visible) {
            if (camera) p.marker.quaternion.copy(camera.quaternion)
            const intenso = p.marker.userData.intenso
            const pulso = 1 + Math.sin(t * 2) * (intenso ? 0.18 : 0.10)
            p.marker.scale.setScalar(pulso * (p.marker.userData.baseScale || 1))
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

    // PC ensamblada cargada en brazos: se sostiene al frente, más abajo y
    // pesada (bamboleo lento), siempre en vertical.
    if (pcCargando && pcCarryGrp && walkMode && camera) {
        camera.getWorldDirection(_scrFwd)
        _scrRight.crossVectors(_scrFwd, _UP).normalize()
        pcCarryGrp.position.copy(camera.position)
            .addScaledVector(_scrFwd, 0.85)
            .addScaledVector(_scrRight, 0.10)
        pcCarryGrp.position.y += -0.42 + Math.sin(t * 2.2) * 0.012
        pcCarryGrp.rotation.set(0, camera.rotation.y, 0)
    }

    // Traslado de la PC (mesa→banco o banco→mesa).
    if (pcTween && pcCarryGrp) {
        pcTween.t += delta / pcTween.dur
        const k = Math.min(1, pcTween.t)
        const e = k * k * (3 - 2 * k)
        pcCarryGrp.position.lerpVectors(pcTween.fromPos, pcTween.toPos, e)
        pcCarryGrp.rotation.y = pcTween.fromRY + (pcTween.toRY - pcTween.fromRY) * e
        pcCarryGrp.scale.setScalar(pcTween.fromS + (pcTween.toS - pcTween.fromS) * e)
        pedirActualizarSombras()
        if (k >= 1) { const al = pcTween.alBanco; pcTween = null; if (al) arrancarPC() }
    }

    // Arranque en el monitor de la estación de pruebas.
    if (bootPC && (frameCount & 1) === 0) dibujarPantallaPC()

    frameCount++
    if (walkMode && walkControls?.isLocked && frameCount % 12 === 0) {
        _crosshairRay.setFromCamera(_CENTER, camera)
        _crosshairRay.far = 3.2
        const targets = heldComponent ? slotDiscs : shelfMeshes
        const hit = _crosshairRay.intersectObjects(targets).length > 0
        if (crosshairEl) crosshairEl.style.color = hit ? '#4ade80' : 'rgba(255,255,255,0.75)'
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

// Toast de logro en pantalla desactivado: los logros se siguen otorgando y
// guardando, pero no se muestra ninguna notificación que tape la interacción.
function notificarLogro(texto, icono = '🏅') {}

// Señal de error MUY notoria y transitoria para cualquier movimiento erróneo:
// encierra el visor 3D en un marco rojo, muestra una ✕ grande al centro, suena el
// tono de error y vibra en móvil. No bloquea la interacción (pointer-events:none)
// y se autodestruye (~1s). Es el reemplazo visible de los avisos que se quitaron.
let _errFxCSS = false
function mostrarErrorVisual(mensaje = '') {
    LFSound.error()
    if (navigator.vibrate) { try { navigator.vibrate([90, 40, 90]) } catch (_) {} }

    const host = document.querySelector('.sim-stage-viewport')
        || document.getElementById('canvas-container') || document.body

    if (!_errFxCSS) {
        const st = document.createElement('style')
        st.textContent =
            '@keyframes lfErrFrame{0%{opacity:0}10%{opacity:1}70%{opacity:1}100%{opacity:0}}' +
            '@keyframes lfErrX{0%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(-15deg)}' +
            '40%{opacity:1;transform:translate(-50%,-50%) scale(1.12) rotate(0)}' +
            '60%{transform:translate(-50%,-50%) scale(.94)}' +
            '100%{opacity:0;transform:translate(-50%,-50%) scale(1.2)}}' +
            '@keyframes lfErrMsg{0%{opacity:0;transform:translate(-50%,10px)}' +
            '15%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0}}' +
            '.lf-err-frame{position:absolute;inset:0;z-index:70;pointer-events:none;' +
            'box-shadow:inset 0 0 0 7px #ff2323, inset 0 0 120px 24px rgba(255,25,25,.55);' +
            'background:rgba(255,20,20,.12);animation:lfErrFrame .9s ease forwards}' +
            '.lf-err-x{position:absolute;left:50%;top:50%;z-index:71;pointer-events:none;' +
            'font-family:system-ui,Arial,sans-serif;font-weight:900;color:#ff2323;' +
            'font-size:min(38vh,260px);line-height:1;' +
            'text-shadow:0 8px 30px rgba(0,0,0,.6),0 0 40px rgba(255,40,40,.9);' +
            'animation:lfErrX .9s cubic-bezier(.2,.9,.3,1) forwards}' +
            '.lf-err-msg{position:absolute;left:50%;bottom:9%;z-index:72;pointer-events:none;' +
            'background:#d31f1f;color:#fff;font-weight:800;font-size:15px;letter-spacing:.3px;' +
            'padding:10px 20px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.45);' +
            'max-width:82%;text-align:center;animation:lfErrMsg 1.6s ease forwards}'
        document.head.appendChild(st)
        _errFxCSS = true
    }

    const frame = document.createElement('div'); frame.className = 'lf-err-frame'
    const x = document.createElement('div'); x.className = 'lf-err-x'; x.textContent = '✕'
    host.appendChild(frame); host.appendChild(x)
    setTimeout(() => { frame.remove(); x.remove() }, 950)

    if (mensaje) {
        const m = document.createElement('div'); m.className = 'lf-err-msg'; m.textContent = mensaje
        host.appendChild(m)
        setTimeout(() => m.remove(), 1650)
    }
}

const LS_KEY = 'lf_instalados'

function leerProgresoLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function guardarProgresoLocal(id) {
    // El setItem va en try/catch: si el navegador bloquea localStorage (modo
    // privado, datos de sitio bloqueados por política, cuota llena) NO debe
    // reventar el avance del ensamble. Antes, esta excepción cortaba
    // finalizarPaso antes de indiceActual++ y la pieza quedaba "sin instalar"
    // (el simulador volvía a pedir el mismo componente).
    try {
        const arr = leerProgresoLocal()
        if (!arr.includes(id)) { arr.push(id); localStorage.setItem(LS_KEY, JSON.stringify(arr)) }
    } catch (_) { /* progreso local no disponible; el avance en memoria sigue */ }
}

function limpiarProgresoLocal() {
    localStorage.removeItem(LS_KEY)
}

const LS_STATS_KEY = 'lf_stats'

// bootDone = ya se completó la prueba de arranque obligatoria (solo mostrarFinal()
// lo pasa en true). Se guarda en cada paso, no solo al final: si el estudiante
// recarga entre instalar la última pieza y terminar la prueba de arranque, initGame()
// necesita saber que la nota de esta sesión (errores/demoras) es real y que el
// arranque sigue pendiente, en vez de asumir 0 errores y saltárselo.
function guardarStatsLocal(bootDone = false) {
    try {
        localStorage.setItem(LS_STATS_KEY, JSON.stringify({
            errores: erroresSesion,
            demoras: demorasSesion,
            tiempoMs: Date.now() - labStartTime,
            bootDone
        }))
    } catch (_) { /* stats locales opcionales; no debe cortar el flujo */ }
}

function leerStatsLocal() {
    try { return JSON.parse(localStorage.getItem(LS_STATS_KEY) || 'null') } catch { return null }
}

function limpiarStatsLocal() {
    localStorage.removeItem(LS_STATS_KEY)
}

function iniciarModoReto(reto) {
    modoReto = {
        reto,
        fase: 'brief',
        inspeccionados: new Set(),
        erroresDiag: 0,
        pistasUsadas: 0,
        piezaLista: false,
        subpaso: null,
        dependientes: [],
        ocultos: new Set(),
        t0: null
    }
    indiceActual = TOTAL
    labStartTime = Date.now()
    initMotor3D()
    motorListo = true
    mostrarBriefReto()
}

function mostrarBriefReto() {
    const r = modoReto.reto
    let ov = document.getElementById('overlay-reto-brief')
    if (!ov) {
        ov = document.createElement('div')
        ov.id = 'overlay-reto-brief'
        ov.className = 'lab-overlay'
        document.body.appendChild(ov)
    }
    ov.innerHTML = `
        <div class="bienvenida-layout" style="grid-template-columns:1fr;max-width:660px;">
            <div class="bienvenida-info-col">
                <span class="lab-eyebrow">Taller de reparación · Reto ${'★'.repeat(r.dificultad)}${'☆'.repeat(3 - r.dificultad)}</span>
                <h1 class="bienvenida-title" style="font-size:2.2rem;">${r.icono} ${r.titulo}</h1>
                <p class="bienvenida-desc" style="font-style:italic;border-left:3px solid #3a8bff;padding-left:14px;">
                    “${r.cliente}”<br><span style="font-size:.8rem;opacity:.7;">— el cliente</span>
                </p>
                <ul class="vf-facts-list" style="margin:14px 0;">
                    ${r.sintomas.map(s => `<li class="vf-fact-item">${s}</li>`).join('')}
                </ul>
                <p class="bienvenida-desc" style="font-size:.88rem;">
                    <strong>Cómo se califica:</strong> partes con 10/10. Cada diagnóstico equivocado resta 2,
                    cada pista resta 1 y tardar más de 6 minutos resta 1. Necesitas ${NOTA_MINIMA_RETO}/10 para aprobar.
                </p>
                <button id="btn-aceptar-reto" class="btn btn-primary bienvenida-btn">🔧 Aceptar el reto</button>
            </div>
        </div>`
    mostrarOverlay('overlay-reto-brief')
    document.getElementById('btn-aceptar-reto')?.addEventListener('click', comenzarInspeccionReto)
}

function comenzarInspeccionReto() {
    const M = modoReto
    M.fase = 'inspeccion'
    M.t0 = Date.now()
    labStartTime = Date.now()
    fase = '3d'
    mostrarOverlay('3d')
    montarDrone('drone-float-svg')

    if (controls) {
        controls.enabled = true
        controls.target.set(0, 0.85, 0)
    }
    camera.position.set(1.55, 1.35, 2.7)

    PASOS.forEach(p => {
        if (!p.marker) return
        p.marker.visible = true
        p.marker.userData.intenso = false
        const radio = Math.max(0.12, p.size * 0.34)
        p.marker.userData.baseScale = Math.min(1, 0.09 / radio)
        p.marker.scale.setScalar(p.marker.userData.baseScale)
    })

    setupSidebarReto()
    renderPanelReto()
    dibujarPantallaTaller()
    actualizarNotaReto()
    droneHabla(`El cliente dice: “${M.reto.cliente}”. Haz clic en los discos para inspeccionar cada componente. Y si quieres medir voltajes, activa el multímetro en el panel de diagnóstico.`)
    setHint(`<strong>${M.reto.icono} ${M.reto.titulo}</strong> — inspecciona los componentes (clic en los discos), mide voltajes con el 🔌 multímetro y diagnostica la falla en el panel derecho.`)
    appendLog(`Reto iniciado: ${M.reto.titulo}`, 'info')

    const title = document.getElementById('mission-title')
    if (title) title.textContent = `RETO: ${M.reto.titulo}`
    actualizarOverlayWalk()
}

function setupSidebarReto() {
    const instr = document.getElementById('instruction-p')
    if (instr) instr.textContent = `“${modoReto.reto.cliente}”`
    const box = document.querySelector('.checklist-box h4')
    if (box) box.textContent = 'Síntomas reportados'
    const ul = document.getElementById('checklist-ul')
    if (ul) {
        ul.innerHTML = modoReto.reto.sintomas.map(s =>
            `<li class="hw-item hw-item--current" style="cursor:default;"><span class="hw-dot"></span><span>${s}</span></li>`
        ).join('')
    }
    const instrH = document.querySelector('.instruction-card h3')
    if (instrH) instrH.textContent = 'Queja del cliente'
}

function actualizarNotaReto() {
    const M = modoReto; if (!M) return
    const nota = calcularNotaReto({
        erroresDiagnostico: M.erroresDiag,
        pistasUsadas: M.pistasUsadas,
        segundos: M.t0 ? (Date.now() - M.t0) / 1000 : 0
    })
    const fill = document.getElementById('progress-fill')
    const lbl  = document.getElementById('progress-label')
    if (fill) {
        fill.style.width = `${nota * 10}%`
        fill.style.background = nota >= NOTA_MINIMA_RETO ? '' : '#ef4444'
    }
    if (lbl) lbl.textContent = `Nota: ${nota.toFixed(1)} / 10`
    const txt = document.querySelector('.progress-text span')
    if (txt) txt.textContent = 'Puntaje del reto'
}

// Lista ordenada de pasos de la fase reparación, con su estado (done/current/
// pending), para el panel lateral. Es la guía principal del jugador: droneHabla
// y setHint son no-op (ver notificaciones eliminadas), así que este checklist
// tiene que bastar por sí solo.
function pasosReparacionUI(M, paso) {
    if (M.reto.componenteFalla === 'cpu') {
        const orden = ['retirar-cooler', 'reemplazar-cpu', 'aplicar-pasta', 'montar-cooler']
        const i = orden.indexOf(M.subpaso)
        const textos = [
            'Retira el disipador (clic en su disco luminoso).',
            `Toma un ${paso.nombre} nuevo de la vitrina e instálalo (clic en su disco).`,
            'Aplica pasta térmica nueva (clic en la jeringa, junto a la mesa de herramientas).',
            'Vuelve a montar el disipador (clic en su disco luminoso).'
        ]
        return textos.map((texto, idx) => ({ texto, estado: idx < i ? 'done' : idx === i ? 'current' : 'pending' }))
    }
    return [
        { texto: `Toma un/a ${paso.nombre} nuevo/a de la vitrina (clic).`, estado: M.piezaLista ? 'done' : 'current' },
        { texto: 'Haz clic en el disco luminoso de la PC para instalarlo.', estado: M.piezaLista ? 'current' : 'pending' }
    ]
}

function renderPanelReto() {
    const M = modoReto; if (!M) return
    let el = document.getElementById('reto-panel')
    if (!el) {
        el = document.createElement('div')
        el.id = 'reto-panel'
        el.style.cssText = 'position:absolute;top:16px;right:16px;z-index:40;width:300px;max-height:calc(100% - 32px);overflow:auto;background:rgba(10,18,30,0.93);color:#eaf2ff;border:1px solid rgba(120,180,255,0.25);border-radius:12px;padding:14px 16px;font-family:Inter,system-ui,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,.45);backdrop-filter:blur(4px);'
        ;(document.getElementById('canvas-container') || document.body).appendChild(el)
    }
    el.style.display = 'block'

    if (M.fase === 'reparacion') {
        const paso = PASOS.find(p => p.id === M.reto.componenteFalla)
        const pasos = pasosReparacionUI(M, paso)
        const nombresDep = M.reto.componenteFalla !== 'cpu'
            ? (M.dependientes || []).map(dId => PASOS.find(p => p.id === dId)?.nombre).filter(Boolean)
            : []
        const notaDep = nombresDep.length
            ? `<div style="color:#9fb3c8;font-size:.76rem;margin:-4px 0 10px;">Piezas retiradas para acceder: ${nombresDep.join(', ')}. Se remontan solas al terminar.</div>`
            : ''
        el.innerHTML = `
            <div style="font-weight:700;font-size:.95rem;">✓ Falla diagnosticada</div>
            <div style="color:#4ade80;font-size:.85rem;margin:6px 0 12px;">${paso.nombre}: ${M.reto.descripcionFalla}</div>
            ${notaDep}
            <ol style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:8px;font-size:.83rem;color:#cdd9e8;">
                ${pasos.map(p => `<li style="${p.estado === 'done' ? 'opacity:.55;text-decoration:line-through;' : p.estado === 'current' ? 'font-weight:600;color:#eaf2ff;' : 'opacity:.55;'}">${p.texto}</li>`).join('')}
            </ol>`
        return
    }

    const filas = PASOS.map(p => {
        const visto = M.inspeccionados.has(p.id)
        return `
            <li style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06);">
                <span style="flex:0 0 16px;text-align:center;">${visto ? '🔍' : '·'}</span>
                <span style="flex:1;font-size:.82rem;${visto ? '' : 'opacity:.6;'}">${p.nombre}</span>
                <button data-diag="${p.id}" title="Diagnosticar como pieza dañada"
                    style="border:1px solid rgba(255,120,120,.45);background:transparent;color:#ff9d9d;font-size:.68rem;border-radius:6px;padding:3px 7px;cursor:pointer;">
                    Es la falla
                </button>
            </li>`
    }).join('')

    const quedanPistas = M.reto.pistas.length - M.pistasUsadas
    el.innerHTML = `
        <div style="font-weight:700;font-size:.95rem;">Diagnóstico</div>
        <div style="color:#9fb3c8;font-size:.78rem;margin:4px 0 10px;">
            Inspecciona con clic en los discos (${M.inspeccionados.size}/${PASOS.length} revisados) y marca la pieza dañada.
        </div>
        <ul style="list-style:none;padding:0;margin:0 0 12px;">${filas}</ul>
        <button id="btn-multimetro-reto"
            style="width:100%;padding:8px;border-radius:8px;margin-bottom:8px;border:1px solid rgba(57,255,120,.4);background:${retoMedicion ? 'rgba(57,255,120,.20)' : 'rgba(57,255,120,.06)'};color:#7dffa8;font-size:.8rem;cursor:pointer;">
            🔌 Multímetro: ${retoMedicion ? 'ON · clic en un componente para medir' : 'OFF · activar (gratis)'}
        </button>
        <button id="btn-pista-reto" ${quedanPistas <= 0 ? 'disabled' : ''}
            style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,213,74,.4);background:rgba(255,213,74,.08);color:#ffd54a;font-size:.8rem;cursor:${quedanPistas > 0 ? 'pointer' : 'default'};opacity:${quedanPistas > 0 ? 1 : 0.45};">
            💡 Pedir pista a TechBot (−1 punto) · quedan ${quedanPistas}
        </button>`

    el.querySelectorAll('[data-diag]').forEach(btn =>
        btn.addEventListener('click', () => diagnosticarReto(btn.getAttribute('data-diag'))))
    el.querySelector('#btn-multimetro-reto')?.addEventListener('click', toggleMultimetroReto)
    el.querySelector('#btn-pista-reto')?.addEventListener('click', pedirPistaReto)
}

function inspeccionarReto(id) {
    const M = modoReto
    const paso = PASOS.find(p => p.id === id)
    const info = M.reto.inspecciones[id]
    if (!paso || !info) return

    M.inspeccionados.add(id)
    const specs = document.getElementById('specs-content')
    if (specs) {
        specs.innerHTML = `
            <div style="font-weight:700;margin-bottom:6px;">🔍 ${paso.brand} ${paso.nombre}</div>
            <p style="font-size:.84rem;line-height:1.5;margin:0;${info.anomalo ? 'color:#ffb04a;font-weight:600;' : ''}">${info.texto}</p>`
    }
    appendLog(`Inspeccionado: ${paso.nombre}`, info.anomalo ? 'warn' : 'info')
    droneHabla(info.texto)
    setHint(`<strong>🔍 ${paso.nombre}:</strong> ${info.texto}`)
    renderPanelReto()
}

function pedirPistaReto() {
    const M = modoReto
    if (M.pistasUsadas >= M.reto.pistas.length) return
    const pista = M.reto.pistas[M.pistasUsadas]
    M.pistasUsadas++
    droneHabla(`💡 Pista: ${pista}`)
    setHint(`<strong>💡 Pista de TechBot:</strong> ${pista}`)
    appendLog(`Pista usada (−1 punto): ${pista}`, 'warn')
    actualizarNotaReto()
    renderPanelReto()
}

function diagnosticarReto(id) {
    const M = modoReto
    const paso = PASOS.find(p => p.id === id)
    if (!paso || M.fase !== 'inspeccion') return

    if (id === M.reto.componenteFalla) {
        M.fase = 'reparacion'
        retoMedicion = false
        ocultarMultimetroReadout()
        PASOS.forEach(p => { if (p.marker) p.marker.visible = false })

        // Oculta la falla y, si hace falta desmontar piezas para acceder a ella
        // (todo lo del gabinete, o lo montado en la placa), también se ocultan.
        M.dependientes = dependientesDe(id)
        // Se recuerda qué ids deben permanecer ocultos aunque su modelo termine
        // de cargar recién ahora (carrera entre precargarModelos, que muestra
        // todo lo "ya instalado", y este diagnóstico); ver debeOcultarsePorReto.
        M.ocultos = new Set([id, ...M.dependientes])
        const m = modelos3D[id]
        if (m) m.visible = false
        M.dependientes.forEach(dId => { const dm = modelos3D[dId]; if (dm) dm.visible = false })
        pedirActualizarSombras()

        appendLog(`✓ Diagnóstico correcto: ${paso.nombre}. Pieza retirada.`, 'success')

        if (id === 'cpu') {
            // El disipador cubre el CPU: hay que retirarlo primero (ya se ocultó
            // arriba) antes de poder cambiar el procesador, y al remontarlo hace
            // falta pasta térmica nueva.
            M.subpaso = 'retirar-cooler'
            const cooler = PASOS.find(p => p.id === 'cooler')
            if (cooler?.marker) { cooler.marker.visible = true; cooler.marker.userData.intenso = true }
            droneHabla(`¡Diagnóstico correcto! ${M.reto.descripcionFalla} Primero retira el disipador para acceder al procesador: haz clic en su disco.`)
            setHint(`<strong>✓ Falla encontrada: ${paso.nombre}.</strong> Primero retira el disipador (clic en su disco luminoso) para acceder al CPU.`)
        } else {
            if (paso.marker) { paso.marker.visible = true; paso.marker.userData.intenso = true }
            const nombresDep = M.dependientes.map(dId => PASOS.find(p => p.id === dId)?.nombre).filter(Boolean)
            const notaDep = nombresDep.length ? ` Para acceder también retiré: ${nombresDep.join(', ')}; se remontan solas al terminar.` : ''
            droneHabla(`¡Diagnóstico correcto! ${M.reto.descripcionFalla} Retiré la pieza dañada: toma un repuesto de la vitrina.${notaDep}`)
            setHint(`<strong>✓ Falla encontrada: ${paso.nombre}.</strong> Toma el repuesto en la vitrina (clic) y luego haz clic en el disco luminoso.`)
        }
        dibujarPantallaTaller()
        renderPanelReto()
    } else {
        M.erroresDiag++
        appendLog(`✗ Diagnóstico incorrecto: ${paso.nombre} (−2 puntos).`, 'system')
        mostrarErrorVisual(`Incorrecto (−2 puntos): ${paso.nombre} no es la falla.`)
        actualizarNotaReto()
    }
}

// ── Fase 2C: multímetro de diagnóstico ──────────────────────────────────────
// Riel/voltaje nominal esperado por componente (con un decimal realista para que
// parezca una lectura de instrumento). Los cables/switch se miden por continuidad.
const RIELES = {
    power:   { et: 'Riel principal (+12 V)',     v: 12.09, u: 'V' },
    mb:      { et: 'Standby +5 V (5VSB)',        v: 5.04,  u: 'V' },
    cpu:     { et: 'Vcore del CPU',              v: 1.28,  u: 'V' },
    cooler:  { et: 'Conector CPU_FAN (+12 V)',   v: 11.98, u: 'V' },
    fans:    { et: 'Ventiladores (+12 V)',       v: 12.05, u: 'V' },
    ram:     { et: 'VDIMM de la RAM',            v: 1.35,  u: 'V' },
    storage: { et: 'Slot M.2 (+3.3 V)',          v: 3.31,  u: 'V' },
    hdd:     { et: 'Disco SATA (+12 V)',         v: 12.02, u: 'V' },
    gpu:     { et: 'PCIe (+12 V) de la GPU',     v: 12.07, u: 'V' },
    sata:    { et: 'Continuidad de datos',       cont: true },
    case:    { et: 'Botón de encendido',         cont: true }
}

// Falla eléctrica = la fuente no entrega energía → TODO el sistema mide 0 V. Es el
// caso donde el multímetro es decisivo; en fallas térmicas/lógicas/de VRAM los
// voltajes salen normales (y eso también es un dato: la avería no es eléctrica).
function esFallaElectricaReto(M) { return !!M && M.reto.componenteFalla === 'power' }

// Componentes que hay que retirar temporalmente para acceder al que se está
// reparando (van montados encima o dentro de él). Se ocultan junto con la
// falla y se restauran (con animación de caída) al terminar la reparación —
// evita que queden "flotando" sin soporte cuando la falla es el gabinete o
// la placa base. El CPU es un caso aparte: el disipador se retira/remonta
// como un paso interactivo propio (ver retirarCoolerReto/montarCoolerReto),
// no automáticamente.
const DEPENDIENTES_REPARACION = {
    case: PASOS.filter(p => p.id !== 'case').map(p => p.id),
    mb:   ['cpu', 'cooler', 'ram', 'storage', 'sata', 'gpu'],
    cpu:  ['cooler']
}
function dependientesDe(id) { return DEPENDIENTES_REPARACION[id] || [] }

// precargarModelos muestra automáticamente todo lo "ya instalado" (idx <
// indiceActual) en cuanto cada GLB termina de cargar — pero en modo reto
// TOTAL ya está instalado desde el inicio (indiceActual=TOTAL), así que una
// pieza que siga cargando cuando el jugador ya diagnosticó la falla (rápido,
// o con conexión lenta) reaparecería sola encima del diagnóstico. M.ocultos
// es la fuente de verdad de qué debe seguir oculto ahora mismo.
function debeOcultarsePorReto(pasoId) {
    return !!(modoReto && modoReto.ocultos && modoReto.ocultos.has(pasoId))
}

function medicionReto(id) {
    const M = modoReto
    const base = RIELES[id] || { et: 'Voltaje', v: 5.0, u: 'V' }
    if (base.cont) {
        const ok = id !== M.reto.componenteFalla
        return { etiqueta: base.et, valorStr: ok ? 'OK · cerrado' : 'ABIERTO', ok, esVoltaje: false }
    }
    if (esFallaElectricaReto(M)) return { etiqueta: base.et, valorStr: `0.00 ${base.u}`, ok: false, esVoltaje: true }
    return { etiqueta: base.et, valorStr: `${base.v.toFixed(2)} ${base.u}`, ok: true, esVoltaje: true }
}

function comentarioMedicion(m, id) {
    if (!m.esVoltaje) return m.ok ? 'El cable tiene continuidad: los datos pueden pasar.' : 'Cable cortado: no hay continuidad.'
    if (!m.ok) {
        if (id === 'power') return 'La fuente NO entrega voltaje en sus rieles: está muerta. Aquí está el origen del problema.'
        return 'Marca 0 V: este componente no recibe energía. En esta PC nada tiene voltaje → rastrea el camino de la corriente hasta la fuente.'
    }
    return 'Voltaje dentro de rango. Recuerda: el multímetro delata fallas de ALIMENTACIÓN; si todo mide bien, la avería es de otro tipo (temperatura, RAM o video).'
}

function medirComponenteReto(id) {
    const M = modoReto
    const paso = PASOS.find(p => p.id === id)
    if (!paso) return
    M.inspeccionados.add(id)
    const m = medicionReto(id)
    const coment = comentarioMedicion(m, id)
    mostrarMultimetroReadout(paso, m)
    const specs = document.getElementById('specs-content')
    if (specs) specs.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px;">🔌 Medición · ${paso.nombre}</div>
        <p style="font-size:.95rem;margin:0;font-weight:700;color:${m.ok ? '#22c55e' : '#ef4444'};">${m.etiqueta}: ${m.valorStr}</p>
        <p style="font-size:.82rem;line-height:1.5;margin:6px 0 0;color:var(--text-700,#3a4a5e);">${coment}</p>`
    appendLog(`Multímetro · ${paso.nombre}: ${m.etiqueta} = ${m.valorStr}`, m.ok ? 'info' : 'warn')
    droneHabla(coment)
    setHint(`<strong>🔌 ${paso.nombre}:</strong> ${m.etiqueta} = <strong>${m.valorStr}</strong>. ${m.ok ? 'Valor normal.' : 'Fuera de rango.'}`)
    renderPanelReto()
}

function mostrarMultimetroReadout(paso, m) {
    let el = document.getElementById('multimeter-readout')
    if (!el) {
        el = document.createElement('div')
        el.id = 'multimeter-readout'
        el.style.cssText = 'position:absolute;left:16px;bottom:16px;z-index:41;width:236px;background:#0a1512;border:2px solid #1c3a2e;border-radius:12px;padding:12px 14px;font-family:"JetBrains Mono",ui-monospace,monospace;box-shadow:0 8px 26px rgba(0,0,0,.5);'
        ;(document.getElementById('canvas-container') || document.body).appendChild(el)
    }
    el.style.display = 'block'
    const col = m.ok ? '#39ff14' : '#ff4d4d'
    el.innerHTML = `
        <div style="font-size:.6rem;letter-spacing:2px;color:#5a7a68;">MULTÍMETRO · DC</div>
        <div style="font-size:1.55rem;font-weight:700;color:${col};text-shadow:0 0 8px ${col}66;margin:2px 0;">${m.valorStr}</div>
        <div style="font-size:.68rem;color:#8fb3a2;">${m.etiqueta}</div>
        <div style="font-size:.66rem;color:#6b8a7a;margin-top:5px;">● medido en ${paso.nombre}</div>`
}

function ocultarMultimetroReadout() {
    const el = document.getElementById('multimeter-readout')
    if (el) el.style.display = 'none'
}

function toggleMultimetroReto() {
    const M = modoReto
    if (!M || M.fase !== 'inspeccion') return
    retoMedicion = !retoMedicion
    if (retoMedicion) {
        LFSound.click()
        droneHabla('Multímetro en mano. Haz clic (o pulsa E) en el disco de un componente para medir su voltaje. Un riel a 0 V significa que no le llega energía.')
        setHint('<strong>🔌 Modo multímetro: ON</strong> — clic en un componente para medir. Vuelve a pulsar el botón (o el multímetro) para guardarlo.')
    } else {
        ocultarMultimetroReadout()
        droneHabla('Guardaste el multímetro. Vuelve a la inspección visual haciendo clic en los discos.')
        setHint('Modo multímetro: OFF. Clic en los discos para inspeccionar visualmente.')
    }
    renderPanelReto()
}

// onClic del prop multímetro: dentro de un reto (inspección) alterna el modo
// medición; fuera de un reto solo explica su uso.
function clicMultimetro() {
    if (modoReto && modoReto.fase === 'inspeccion') { toggleMultimetroReto(); return }
    droneHabla('Multímetro digital: mide voltajes para diagnosticar la fuente y detectar componentes sin energía. Se usa en los retos de reparación.')
}

// ── Fase reparación: helpers compartidos por clicReto (mouse/órbita) e
// interactuarEReto (tecla E/caminar) ─────────────────────────────────────────

// Toma de la vitrina el repuesto de la pieza dañada. Al caminar, se muestra en
// la mano con el mismo aparato visual que en el ensamblaje normal
// (agarrarComponente); en modo órbita se mantiene el flag simple, igual que la
// selección de componentes fuera de reto.
function tomarRepuestoReto(pasoId) {
    const M = modoReto
    const fallaId = M.reto.componenteFalla
    const paso = PASOS.find(p => p.id === pasoId)
    if (pasoId !== fallaId) {
        droneHabla(`Ese es ${paso.nombre}, pero la pieza dañada es ${PASOS.find(p => p.id === fallaId).nombre}.`)
        return
    }
    if (fallaId === 'cpu' && M.subpaso !== 'reemplazar-cpu') {
        droneHabla(M.subpaso === 'retirar-cooler'
            ? 'Primero retira el disipador (clic en su disco) para acceder al procesador.'
            : 'Termina de reinstalar el disipador antes de continuar.')
        return
    }
    M.piezaLista = true
    if (walkMode) agarrarComponente(pasoId)
    droneHabla(`Perfecto: ${paso.nombre} nuevo en mano. Ahora haz clic (o E) en el disco luminoso para instalarlo.`)
    setHint(`<strong>En mano: ${paso.nombre} (repuesto).</strong> Haz clic o pulsa E en el disco luminoso para instalarlo.`)
    appendLog(`Repuesto tomado: ${paso.nombre}`, 'info')
    renderPanelReto()
}

// Clic/E sobre un disco luminoso en fase reparación. Despacha según a cuál
// corresponde: el de la falla (instala el repuesto), o el del disipador
// durante la secuencia especial de CPU (retirarlo / volver a montarlo).
// Devuelve true si consumió la interacción.
function clicDiscoReto(dHits) {
    const M = modoReto
    const fallaId = M.reto.componenteFalla
    const tieneId = id => dHits.some(h => h.object.userData.id === id)

    if (fallaId === 'cpu' && tieneId('cooler')) {
        if (M.subpaso === 'retirar-cooler') { retirarCoolerReto(); return true }
        if (M.subpaso === 'montar-cooler') { montarCoolerReto(); return true }
    }
    if (!tieneId(fallaId)) return false
    if (fallaId === 'cpu' && M.subpaso !== 'reemplazar-cpu') return false
    if (!M.piezaLista) { droneHabla('Primero toma el repuesto de la vitrina.'); return true }
    instalarReemplazoReto()
    return true
}

// Clic/E sobre un prop interactivo (herramientas, multímetro…). Devuelve true
// si consumió la interacción.
function clicPropReto(hits) {
    if (!hits.length) return false
    let obj = hits[0].object
    while (obj && !obj.userData.fact && !obj.userData.onClic) obj = obj.parent
    if (obj?.userData.onClic) { obj.userData.onClic(); return true }
    if (obj?.userData.fact) { droneHabla(obj.userData.fact); return true }
    return false
}

function clicReto(e) {
    const M = modoReto
    if (!M || M.fase === 'brief' || M.fase === 'final') return
    setMouseDesdeEvento(e)
    raycaster.setFromCamera(mouse, camera)

    if (M.fase === 'inspeccion') {
        const hits = raycaster.intersectObjects(slotDiscs)
        if (hits.length) {
            const id = hits[0].object.userData.id
            if (retoMedicion) medirComponenteReto(id); else inspeccionarReto(id)
            return
        }

        const sHits = raycaster.intersectObjects(shelfMeshes)
        if (sHits.length) {
            droneHabla('La vitrina es para los repuestos. Primero diagnostica cuál pieza está dañada.')
            return
        }
    } else if (M.fase === 'reparacion') {
        const sHits = raycaster.intersectObjects(shelfMeshes)
        if (sHits.length) { tomarRepuestoReto(sHits[0].object.userData.pasoId); return }

        const dHits = raycaster.intersectObjects(slotDiscs)
        if (dHits.length && clicDiscoReto(dHits)) return
    }

    if (clicPropReto(raycaster.intersectObjects(propsInteractivos, true))) return
}

function instalarReemplazoReto() {
    const M = modoReto
    const paso = PASOS.find(p => p.id === M.reto.componenteFalla)

    ocultarMarcador(paso.id)
    colocarModelo(paso, true)
    soltarComponenteInstalado(paso.id)
    M.ocultos.delete(paso.id)
    appendLog(`${paso.nombre} reemplazado.`, 'success')

    if (M.reto.componenteFalla === 'cpu') {
        // No se finaliza todavía: falta reaplicar pasta térmica y remontar el
        // disipador antes de encender la PC.
        M.subpaso = 'aplicar-pasta'
        droneHabla('¡Procesador nuevo instalado! Antes de montar el disipador, aplica pasta térmica nueva: haz clic en la jeringa junto a la mesa de herramientas.')
        setHint('<strong>CPU instalado.</strong> Aplica pasta térmica nueva: clic en la jeringa de pasta.')
        renderPanelReto()
        return
    }

    finalizarInstalacionReto()
}

// Retira el disipador (fase reparación de CPU, subpaso 'retirar-cooler'):
// avanza a "toma el CPU nuevo" y revela su disco.
function retirarCoolerReto() {
    const M = modoReto
    LFSound.click()
    M.subpaso = 'reemplazar-cpu'
    ocultarMarcador('cooler')
    const cpuPaso = PASOS.find(p => p.id === 'cpu')
    if (cpuPaso?.marker) { cpuPaso.marker.visible = true; cpuPaso.marker.userData.intenso = true }
    appendLog('Disipador retirado para acceder al procesador.', 'success')
    droneHabla('Disipador retirado. Ahora toma el procesador nuevo de la vitrina.')
    setHint('<strong>Disipador retirado.</strong> Toma el procesador nuevo de la vitrina (clic) y luego haz clic en su disco.')
    renderPanelReto()
}

// onClic de la jeringa de pasta térmica: solo actúa durante el subpaso
// 'aplicar-pasta' de una reparación de CPU; el resto del tiempo solo explica
// su uso (igual que el resto de herramientas del taller).
function clicPastaTermica() {
    const M = modoReto
    if (M && M.fase === 'reparacion' && M.reto.componenteFalla === 'cpu' && M.subpaso === 'aplicar-pasta') {
        LFSound.click()
        M.subpaso = 'montar-cooler'
        const cooler = PASOS.find(p => p.id === 'cooler')
        if (cooler?.marker) { cooler.marker.visible = true; cooler.marker.userData.intenso = true }
        appendLog('Pasta térmica nueva aplicada sobre el CPU.', 'success')
        droneHabla('Pasta térmica aplicada. Ahora vuelve a montar el disipador: haz clic en su disco luminoso.')
        setHint('<strong>Pasta térmica aplicada.</strong> Monta de nuevo el disipador: clic en su disco luminoso.')
        renderPanelReto()
        return
    }
    droneHabla('Pasta térmica: se aplica una gota del tamaño de un guisante sobre el CPU. Rellena los microporos y conduce el calor al disipador.')
}

// Vuelve a montar el disipador (fase reparación de CPU, subpaso
// 'montar-cooler', ya con pasta nueva aplicada) y cierra la reparación.
function montarCoolerReto() {
    const M = modoReto
    ocultarMarcador('cooler')
    colocarModelo(PASOS.find(p => p.id === 'cooler'), true)
    M.ocultos.delete('cooler')
    appendLog('Disipador montado de nuevo.', 'success')
    finalizarInstalacionReto()
}

// Cierra la fase de reparación: remonta (con animación de caída) las piezas
// que se ocultaron para acceder a la falla y programa el encendido final.
function finalizarInstalacionReto() {
    const M = modoReto
    M.fase = 'final'
    if (walkControls?.isLocked) walkControls.unlock()
    actualizarOverlayWalk()

    const deps = M.dependientes || []
    deps.forEach(dId => {
        // El disipador de la secuencia CPU ya se remontó a mano (montarCoolerReto).
        if (M.reto.componenteFalla === 'cpu' && dId === 'cooler') return
        const dPaso = PASOS.find(p => p.id === dId)
        if (dPaso) colocarModelo(dPaso, true)
        M.ocultos.delete(dId)
    })

    appendLog('Encendiendo la PC…', 'success')
    droneHabla('¡Todo en su lugar! Encendiendo para verificar… POST correcto. ¡La PC funciona!')
    setTimeout(finalizarReto, 1800)
}

async function finalizarReto() {
    const M = modoReto
    const r = M.reto
    const segundos = Math.round((Date.now() - M.t0) / 1000)
    const nota = calcularNotaReto({ erroresDiagnostico: M.erroresDiag, pistasUsadas: M.pistasUsadas, segundos })
    const exito = nota >= NOTA_MINIMA_RETO

    const resultado = {
        retoId: r.id, nota, exito,
        erroresDiagnostico: M.erroresDiag,
        pistasUsadas: M.pistasUsadas,
        inspecciones: M.inspeccionados.size,
        segundos
    }

    const guardado = await guardarResultadoReto(resultado)
    let logrosNuevos = []
    // Sin guardado no hay nada que otorgar: mostrar insignias "desbloqueadas" que
    // nunca se persistieron confundiría al estudiante (parecerían ganadas y no lo están).
    if (guardado) {
        try {
            const resultados = await obtenerResultadosRetos()

            // null = el GET falló (aunque el POST ya tuvo éxito): usamos este intento
            // como mejor estimación. [] = el servidor confirmó que no hay filas; se
            // respeta tal cual en vez de inventar historial.
            const historial = resultados === null ? [{
                reto_id: r.id, nota, exito,
                errores_diagnostico: M.erroresDiag, pistas_usadas: M.pistasUsadas, segundos
            }] : resultados
            const candidatos = LOGROS_RETO.filter(l => l.condition(historial)).map(l => l.id)
            if (candidatos.length) {
                const previos = await obtenerLogrosUsuario()
                logrosNuevos = candidatos.filter(id => !previos.includes(id))
                if (logrosNuevos.length) await otorgarLogros(logrosNuevos, r.id)
            }
        } catch (_) {  }
    }

    mostrarFinalReto(resultado, logrosNuevos, guardado)
}

function mostrarFinalReto(res, logrosNuevos, guardado) {
    const r = modoReto.reto
    const aprobado = res.exito
    if (aprobado) LFSound.complete(); else LFSound.error()
    let ov = document.getElementById('overlay-reto-final')
    if (!ov) {
        ov = document.createElement('div')
        ov.id = 'overlay-reto-final'
        ov.className = 'lab-overlay'
        document.body.appendChild(ov)
    }

    const logrosHtml = logrosNuevos.length ? `
        <div style="margin:16px 0 4px;">
            <div style="font-size:.8rem;letter-spacing:1px;color:#9fb3c8;margin-bottom:8px;">🏅 LOGROS DESBLOQUEADOS</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
                ${logrosNuevos.map(id => {
                    const l = LOGROS_RETO.find(x => x.id === id)
                    return l ? `<span style="background:rgba(255,213,74,.12);border:1px solid rgba(255,213,74,.4);color:#ffd54a;border-radius:99px;padding:6px 14px;font-size:.82rem;">${l.icono} ${l.titulo}</span>` : ''
                }).join('')}
            </div>
        </div>` : ''

    ov.innerHTML = `
        <div class="final-layout" style="max-width:720px;">
            <div class="final-content">
                <h1 class="final-title">${aprobado ? '¡PC reparada!' : 'Reparación completada'}</h1>
                <p class="final-desc">
                    ${aprobado
                        ? `Diagnóstico y reemplazo correctos. ${guardado ? 'Tu calificación quedó registrada.' : '(Sin conexión: la nota no se pudo guardar en la base de datos.)'}`
                        : `La PC quedó funcionando, pero la nota está bajo el mínimo (${NOTA_MINIMA_RETO}/10). Puedes reintentarlo: en el taller se aprende reparando.`}
                </p>
                <div class="final-stats">
                    <div class="final-stat"><strong style="color:${aprobado ? '#22c55e' : '#ef4444'}">${res.nota.toFixed(1)}/10</strong><span>Nota<br>${aprobado ? 'APROBADO' : 'NO APROBADO'}</span></div>
                    <div class="final-stat"><strong>${formatTiempo(res.segundos)}</strong><span>Tiempo de<br>reparación</span></div>
                    <div class="final-stat"><strong>${res.erroresDiagnostico}</strong><span>Diagnósticos<br>errados</span></div>
                    <div class="final-stat"><strong>${res.pistasUsadas}</strong><span>Pistas<br>usadas</span></div>
                </div>
                <p class="final-desc" style="font-size:.86rem;background:rgba(58,139,255,.08);border:1px solid rgba(58,139,255,.25);border-radius:10px;padding:12px 16px;">
                    🎓 <strong>¿Por qué era ${PASOS.find(p => p.id === r.componenteFalla).nombre}?</strong><br>${r.explicacion}
                </p>
                ${logrosHtml}
                <div class="final-actions">
                    <button type="button" class="btn btn-primary" id="btn-reto-reintentar">↻ Reintentar este reto</button>
                    <a href="retos.html" class="btn btn-secondary">Ver más retos →</a>
                    <a href="menu.html" class="btn btn-secondary">Mi panel</a>
                </div>
            </div>
        </div>`
    mostrarOverlay('overlay-reto-final')
    document.getElementById('btn-reto-reintentar')?.addEventListener('click', () => location.reload())
    const panel = document.getElementById('reto-panel')
    if (panel) panel.style.display = 'none'
    retoMedicion = false
    ocultarMultimetroReadout()
}

async function initGame() {

    const retoParam = new URLSearchParams(location.search).get('reto')
    if (retoParam) {
        const reto = obtenerReto(retoParam)
        if (reto) { iniciarModoReto(reto); return }
        appendLog(`Reto "${retoParam}" no encontrado; se abre el modo ensamblaje.`, 'warn')
    }

    let instalados = leerProgresoLocal()

    if (instalados.length === 0) {
        const progreso = await obtenerProgreso()
        if (progreso) instalados = progreso.componentes_instalados || []
    }

    const savedStats = leerStatsLocal()

    if (instalados.length >= TOTAL) {

        indiceActual     = TOTAL
        sessionStartTime = Date.now()
        labStartTime     = savedStats ? Date.now() - savedStats.tiempoMs : Date.now()
        erroresSesion    = savedStats?.errores ?? 0
        demorasSesion    = savedStats?.demoras ?? 0
        renderChecklist()
        initMotor3D()
        motorListo = true
        if (savedStats?.bootDone) {
            // Sesión ya completada en una visita anterior: se muestra el resumen con
            // la nota definitiva (la prueba de arranque ya se hizo en su momento).
            await calcularNotaFinal()
            mostrarFinal()
        } else {
            // Se instaló todo pero la pestaña se cerró/recargó antes de terminar la
            // prueba de arranque obligatoria (o antes de que existiera lf_stats):
            // no saltarse el requisito. iniciarPruebaFinal() ya recalcula la nota.
            iniciarPruebaFinal()
        }
        return
    }

    indiceActual = Math.min(instalados.length, TOTAL)
    sessionStartTime = Date.now()
    labStartTime = savedStats ? Date.now() - savedStats.tiempoMs : Date.now()
    erroresSesion = savedStats?.errores ?? 0
    demorasSesion = savedStats?.demoras ?? 0

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

document.getElementById('btn-empezar')?.addEventListener('click', () => {
    LFSound.unlock()
    if (!preTestHecho && indiceActual === 0) mostrarEvaluacion('pre', () => mostrarVideo(0))
    else mostrarVideo(indiceActual)
})
document.getElementById('btn-ir-3d')?.addEventListener('click', () => { LFSound.unlock(); mostrarFase3D(indiceActual) })
document.getElementById('btn-skip-video')?.addEventListener('click', () => mostrarFase3D(indiceActual))

function actualizarIconoSonido(btn, muted) {
    if (!btn) return
    const on = btn.querySelector('.lf-sound-icon--on')
    const off = btn.querySelector('.lf-sound-icon--off')
    if (on) on.style.display = muted ? 'none' : 'block'
    if (off) off.style.display = muted ? 'block' : 'none'
    btn.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar sonido')
    btn.setAttribute('title', muted ? 'Activar sonido' : 'Silenciar sonido')
}

const soundToggleBtn = document.getElementById('sound-toggle')
actualizarIconoSonido(soundToggleBtn, LFSound.isMuted())
soundToggleBtn?.addEventListener('click', (e) => {
    LFSound.unlock()
    const muted = LFSound.toggleMute()
    actualizarIconoSonido(e.currentTarget, muted)
})

document.addEventListener('click', (e) => {
    if (e.target.closest('.btn, button')) LFSound.click()
})

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

if (ES_TACTIL) {
    const titulo = document.getElementById('walk-start-title')
    const sub = document.getElementById('walk-start-sub')
    if (titulo) titulo.textContent = 'Requiere computadora'
    if (sub) sub.innerHTML = 'El modo de exploración 3D necesita <b>mouse y teclado</b>. Abre este laboratorio desde una PC para caminar e instalar los componentes.'
    document.getElementById('walk-controls')?.setAttribute('hidden', '')
}

document.getElementById('walk-start-btn')?.addEventListener('click', () => {
    if (ES_TACTIL) {
        droneHabla('El modo de exploración 3D solo funciona en una computadora con mouse y teclado.')
        appendLog('Este dispositivo táctil no soporta el modo de caminar. Usa una PC para esta parte.', 'warning')
        return
    }
    const card = document.getElementById('walk-start')
    if (card) card.style.display = 'none'
    entrarCaminar()
})

window.addEventListener('keydown', (e) => {
    // Ignora la auto-repetición del SO al mantener una tecla presionada: sin esto,
    // KeyE dispara interactuarE() muchas veces por segundo mientras se mantiene
    // pulsada, pudiendo reentrar en una instalación ya en curso.
    if (e.repeat) return
    switch (e.code) {
        case 'KeyW': case 'ArrowUp':    if (walkMode) teclas.w = true; break
        case 'KeyS': case 'ArrowDown':  if (walkMode) teclas.s = true; break
        case 'KeyA': case 'ArrowLeft':  if (walkMode) teclas.a = true; break
        case 'KeyD': case 'ArrowRight': if (walkMode) teclas.d = true; break
        case 'ShiftLeft': case 'ShiftRight': if (walkMode) teclas.shift = true; break
        case 'KeyE': interactuarE(); break
        case 'KeyQ':
            if (walkMode && heldComponent) soltarComponente()
            else if (walkMode && pcCargando) devolverPCaMesa()
            break
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
    // Requisito pedagógico: el laboratorio 3D (ensamble y retos) exige completar
    // la Academia con buena calificación. Se baja la nota del servidor primero
    // para que el requisito valga entre dispositivos; sin red decide lo local.
    try { await sincronizarAcademia() } catch (e) { /* offline: usamos lo local */ }
    if (!academiaAprobada()) {
        window.location.replace('academia.html?bloqueo=sim')
        return
    }
    initGame()
})
