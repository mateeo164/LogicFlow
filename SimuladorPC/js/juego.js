import { protegerRuta } from './auth.js'
import { obtenerProgreso, guardarProgreso, reiniciarProgreso, registrarEvento, marcarAprobacionWeb, subirFotoSimulador, guardarComprension } from './progreso.js'
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
import { PREGUNTAS_COMPONENTE, EVALUACION, notaConceptual, combinarNota, gananciaAprendizaje } from './quiz-data.js'

import { PASOS } from './pasos-data.js'
import { crearTexturaRadial, crearTexturaMadera, crearTexturaMaderaClara, crearTexturaLetreroComponentes, crearTexturaPisoModerno, crearTexturaPegboard, crearTexturaMat, crearTexturaEtiqueta, crearTexturaPared, crearTexturaCielo, crearTexturaCartel, crearTexturaBlueprint } from './texturas.js'

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

const ES_TACTIL = window.matchMedia('(pointer: coarse)').matches || !window.matchMedia('(pointer: fine)').matches

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

function pedirActualizarSombras() {
    if (renderer) renderer.shadowMap.needsUpdate = true
}

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
    setHint(`<strong>Instala: ${paso.nombre}</strong> — haz clic en la pieza dentro de la vitrina y luego en el disco luminoso.`)
}

function droneHabla(msg) {
    const el = document.getElementById('drone-float-msg')
    if (el) el.textContent = msg
}

// Evaluación formativa: micro-pregunta conceptual tras instalar un componente.
// Da retroalimentación del PORQUÉ y suma a la nota de comprensión.
// Llama onDone() cuando el estudiante pulsa "Continuar".
function mostrarQuizComponente(paso, onDone) {
    const q = PREGUNTAS_COMPONENTE[paso.id]
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

function calcularNota() {
    const notaDestreza = Math.max(0, Math.min(10, 10 - erroresSesion * 1.0 - demorasSesion * 0.5))
    // La nota final mezcla la destreza en el ensamble con la comprensión demostrada
    // en las preguntas conceptuales. Así aprobar exige entender, no solo hacer clic.
    if (preguntasRespondidas > 0) {
        return combinarNota(notaDestreza, notaConceptual(aciertosConceptuales, preguntasRespondidas))
    }
    return notaDestreza
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
    LFSound.complete()

    const t = Math.round((Date.now() - labStartTime) / 1000)
    const notaBase = calcularNota()
    const aprobado = notaBase >= NOTA_MINIMA
    notaFinalSesion = notaBase

    const titEl = document.getElementById('final-title')
    const descEl = document.getElementById('final-desc')
    if (titEl) titEl.innerHTML = aprobado ? '¡PC ensamblada<br>con éxito!' : 'Ensamble<br>completado'
    if (descEl) {
        descEl.textContent = aprobado
            ? `¡Aprobado! Tu ensamble cumple el estándar (mínimo ${NOTA_MINIMA}/10). Continúa en la app móvil para practicar la instalación real y desbloquear tu certificado.`
            : `Tu nota está por debajo del mínimo aceptable (${NOTA_MINIMA}/10). Repasa el orden y la elección de las piezas, y vuelve a intentarlo.`
    }

    const el = document.getElementById('final-stats')
    if (el) {
        el.innerHTML = `
            <div class="final-stat"><strong>${TOTAL}</strong><span>Componentes<br>instalados</span></div>
            <div class="final-stat"><strong>${formatTiempo(t)}</strong><span>Tiempo de<br>ensamblaje</span></div>
            <div class="final-stat"><strong>${erroresSesion}</strong><span>Errores<br>cometidos</span></div>
            <div class="final-stat"><strong>${aciertosConceptuales}/${preguntasRespondidas}</strong><span>Preguntas<br>acertadas</span></div>
            <div class="final-stat"><strong id="final-nota" style="color:${aprobado ? '#22c55e' : '#ef4444'}">${notaBase.toFixed(1)}/10</strong><span id="final-nota-lbl">Nota<br>${aprobado ? 'APROBADO' : 'NO APROBADO'}</span></div>`
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

    procesarCierreSesion(notaBase, aprobado)
}

async function procesarCierreSesion(notaBase, aprobado) {

    const ganados = ['primera_pc', 'componente_estrella']
    if (erroresSesion === 0) ganados.push('sin_errores')
    try { await otorgarLogros(ganados, 'ensamble:final') } catch (_) {}

    let nLogros = 0
    try { nLogros = (await obtenerLogrosUsuario()).length } catch (_) {}
    const notaFinal = notaConBono(notaBase, nLogros)
    notaFinalSesion = notaFinal
    const aprobadoFinal = notaFinal >= NOTA_MINIMA

    const notaEl = document.getElementById('final-nota')
    const lblEl = document.getElementById('final-nota-lbl')
    if (notaEl) {
        notaEl.textContent = `${notaFinal.toFixed(1)}/10`
        notaEl.style.color = aprobadoFinal ? '#22c55e' : '#ef4444'
    }
    const bono = notaFinal - notaBase
    if (lblEl) {
        lblEl.innerHTML = bono > 0.001
            ? `Nota (base ${notaBase.toFixed(1)} +${bono.toFixed(2)} logros)<br>${aprobadoFinal ? 'APROBADO' : 'NO APROBADO'}`
            : `Nota<br>${aprobadoFinal ? 'APROBADO' : 'NO APROBADO'}`
    }

    if (!aprobadoFinal) return

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
    actualizarOverlayWalk()
    droneHabla('¡Tu PC está lista! Camina por el taller y observa el sistema que construiste. Usa W/A/S/D para moverte.')
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
    dibujarPantallaTaller()
}

function appendLog(msg, type = 'system') {
    const log = document.getElementById('terminal-log')
    if (log) {
        const line = document.createElement('div')
        line.className = `log-line ${type}`
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`
        log.appendChild(line)
        log.scrollTop = log.scrollHeight
    }
    if (type === 'success') LFSound.success()
    else if (type === 'warn' || type === 'warning') LFSound.error()
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
            droneHabla(`"${paso.nombre}" ya está instalado en el PC.`)
        } else if (idx > indiceActual) {
            droneHabla(`Todavía no toca "${paso.nombre}". Ahora corresponde instalar "${PASOS[indiceActual]?.nombre}".`)
        } else {
            handleSelection(pasoId)
        }
        return
    }

    if (propsInteractivos.length) {
        const pHits = raycaster.intersectObjects(propsInteractivos, true)
        if (pHits.length) {
            let obj = pHits[0].object
            while (obj && !obj.userData.fact) obj = obj.parent
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
        const continuar = () => {
            if (indiceActual < TOTAL) mostrarVideo(indiceActual)
            else mostrarEvaluacion('post', () => mostrarFinal())  // test final antes del cierre
        }
        mostrarQuizComponente(paso, continuar)
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

    if (modoReto) { interactuarEReto(eRay); return }

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

            const pHits = eRay.intersectObjects(propsInteractivos, true)
            if (pHits.length) {
                let obj = pHits[0].object
                while (obj && !obj.userData.fact) obj = obj.parent
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
        if (dHits.length) { inspeccionarReto(dHits[0].object.userData.id); return }

        const pHits = eRay.intersectObjects(propsInteractivos, true)
        if (pHits.length) {
            let obj = pHits[0].object
            while (obj && !obj.userData.fact) obj = obj.parent
            if (obj?.userData.fact) { droneHabla(obj.userData.fact); return }
        }
        droneHabla('Apunta al disco luminoso de un componente y pulsa E para inspeccionarlo. Cuando sepas cuál falla, pulsa Esc y márcalo en el panel de diagnóstico.')
        return
    }

    // Fase reparación: tomar el repuesto de la vitrina e instalarlo
    const fallaId = M.reto.componenteFalla
    const sHits = eRay.intersectObjects(shelfMeshes)
    if (sHits.length) {
        const pasoId = sHits[0].object.userData.pasoId
        const paso = PASOS.find(p => p.id === pasoId)
        if (pasoId === fallaId) {
            M.piezaLista = true
            droneHabla(`Perfecto: ${paso.nombre} nuevo en mano. Ahora apunta al disco luminoso de la PC y pulsa E para instalarlo.`)
            setHint(`<strong>En mano: ${paso.nombre} (repuesto).</strong> Apunta al disco luminoso y pulsa E para instalarlo.`)
            appendLog(`Repuesto tomado: ${paso.nombre}`, 'info')
            renderPanelReto()
        } else {
            droneHabla(`Ese es ${paso.nombre}, pero la pieza dañada es ${PASOS.find(p => p.id === fallaId).nombre}.`)
        }
        return
    }

    const dHits = eRay.intersectObjects(slotDiscs)
    if (dHits.find(h => h.object.userData.id === fallaId)) {
        if (!M.piezaLista) {
            droneHabla('Primero toma el repuesto de la vitrina: apúntale y pulsa E.')
            return
        }
        instalarReemplazoReto()
        return
    }
    droneHabla('Apunta al repuesto en la vitrina o al disco luminoso de la PC y pulsa E.')
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
    P.focusOffset = new THREE.Vector3(0.24, 0.12, 0.94)

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
                    new THREE.Vector3(0.22, 0.08, 0.90),
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
                    new THREE.Vector3(-0.04, 0.22, 0.90),
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
                    new THREE.Vector3(0.14, 0.00, 0.90),
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
    crearLedPerimetral(grupo)
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
        fact = null, id = null, anim = true, centroY = null, onReady = null
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
        if (fact) { g.userData.fact = fact; propsInteractivos.push(g) }
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
}

// Banco de pruebas con periféricos encima. Se calcula la altura real de la
// superficie del banco (onReady) para apoyar monitor/teclado/mouse sin adivinar.
// El banco va contra la pared derecha con su lado largo paralelo a la pared
// (rotY=0). Monitor al fondo y teclado al frente miran hacia el centro (rotY=-90°),
// apilados en X para no encimarse en la poca profundidad del banco.
function montarEstacionPruebas() {
    const wbX = 4.25, wbZ = 1.9, faceCentro = -Math.PI / 2
    cargarProp('workbench_low-poly.opt.glb', {
        id: 'workbench', size: 1.9, x: wbX, z: wbZ, rotY: 0,
        fact: 'Banco de pruebas: aquí se enciende la PC terminada para su primer arranque (POST).',
        onReady: (g, half) => {
            const topY = g.position.y + half.y
            cargarProp('pc_monitor.opt.glb', {
                id: 'monitor', size: 0.9, x: wbX + 0.16, z: wbZ, y: topY, rotY: faceCentro, anim: false,
                fact: 'Monitor de pruebas: muestra el POST/BIOS cuando la PC arranca por primera vez.'
            })
            cargarProp('keyboard.opt.glb', {
                id: 'keyboard', size: 0.55, x: wbX - 0.18, z: wbZ, y: topY, rotY: faceCentro, anim: false,
                fact: 'Teclado de diagnóstico: con Supr o F2 se entra a la BIOS.'
            })
            cargarProp('mouse.opt.glb', {
                id: 'mouse', size: 0.12, x: wbX - 0.18, z: wbZ + 0.34, y: topY, rotY: faceCentro,
                fact: 'Mouse de pruebas.'
            })
            cargarProp('desk_lamp.opt.glb', {
                id: 'lamp', size: 0.5, x: wbX + 0.12, z: wbZ - 0.7, y: topY, rotY: faceCentro,
                fact: 'Lámpara de banco: buena luz para no equivocarse al conectar cables pequeños.'
            })
        }
    })
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

function crearLedPerimetral(grupo) {
    const { xMin, xMax, zMin, zMax, y0, h } = SALA
    const y = y0 + h - 0.16
    const mat = new THREE.MeshStandardMaterial({ color: 0x1cc9ff, emissive: 0x1cc9ff, emissiveIntensity: 1.5, roughness: 1 })
    const W = xMax - xMin, D = zMax - zMin
    const t = 0.035
    const mk = (sx, sz, px, pz) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(sx, t, sz), mat)
        m.position.set(px, y, pz)
        grupo.add(m)
    }
    mk(W - 0.2, t, 0, zMin + 0.05)
    mk(W - 0.2, t, 0, zMax - 0.05)
    mk(t, D - 0.2, xMin + 0.05, 0)
    mk(t, D - 0.2, xMax - 0.05, 0)
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

    scene.add(new THREE.AmbientLight(0xffffff, 0.28))
    scene.add(new THREE.HemisphereLight(0xfff1d8, 0x55504a, 0.42))

    const key = new THREE.DirectionalLight(0xfff4e2, 1.6)
    key.position.set(2.5, 5, 3)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
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
        const mats = Array.isArray(n.material) ? n.material : [n.material]
        mats.forEach(m => { if (m) claves.forEach(k => optimizarTextura(m[k])) })
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
        pedirActualizarSombras()
        if (cargados >= total) { clearTimeout(safety); ocultarLoading() }
    }

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

let _logroToastCSS = false
function notificarLogro(texto, icono = '🏅') {
    if (!_logroToastCSS) {
        const st = document.createElement('style')
        st.textContent =
            '@keyframes lfLogroIn{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}' +
            '@keyframes lfLogroOut{to{opacity:0;transform:translateY(-10px)}}' +
            '.lf-logro-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9999;' +
            'display:flex;align-items:center;gap:12px;max-width:420px;padding:13px 18px;border-radius:14px;' +
            'background:linear-gradient(135deg,#11213a,#0e1726);border:1px solid #2b6cff55;color:#eaf2ff;' +
            'box-shadow:0 14px 40px rgba(0,0,0,.45);font-family:"Segoe UI",Arial,sans-serif;animation:lfLogroIn .35s ease}' +
            '.lf-logro-toast .ic{font-size:26px;filter:drop-shadow(0 2px 6px #2b6cff88)}' +
            '.lf-logro-toast b{display:block;font-size:12px;letter-spacing:.6px;color:#7fb0ff;text-transform:uppercase}' +
            '.lf-logro-toast span{font-size:14px;color:#dbe7f5}'
        document.head.appendChild(st)
        _logroToastCSS = true
    }
    const el = document.createElement('div')
    el.className = 'lf-logro-toast'
    el.innerHTML = `<div class="ic">${icono}</div><div><b>¡Logro desbloqueado!</b><span>${texto}</span></div>`
    document.body.appendChild(el)
    setTimeout(() => {
        el.style.animation = 'lfLogroOut .4s ease forwards'
        setTimeout(() => el.remove(), 400)
    }, 3200)
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

function iniciarModoReto(reto) {
    modoReto = {
        reto,
        fase: 'brief',
        inspeccionados: new Set(),
        erroresDiag: 0,
        pistasUsadas: 0,
        piezaLista: false,
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
    droneHabla(`El cliente dice: “${M.reto.cliente}”. Haz clic en los discos de la PC para inspeccionar cada componente.`)
    setHint(`<strong>${M.reto.icono} ${M.reto.titulo}</strong> — inspecciona los componentes (clic en los discos) y diagnostica la falla en el panel derecho.`)
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
        el.innerHTML = `
            <div style="font-weight:700;font-size:.95rem;">✓ Falla diagnosticada</div>
            <div style="color:#4ade80;font-size:.85rem;margin:6px 0 12px;">${paso.nombre}: ${M.reto.descripcionFalla}</div>
            <ol style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:8px;font-size:.83rem;color:#cdd9e8;">
                <li style="${M.piezaLista ? 'opacity:.55;text-decoration:line-through;' : 'font-weight:600;color:#eaf2ff;'}">Toma un/a ${paso.nombre} nuevo/a de la vitrina (clic).</li>
                <li style="${M.piezaLista ? 'font-weight:600;color:#eaf2ff;' : 'opacity:.55;'}">Haz clic en el disco luminoso de la PC para instalarlo.</li>
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
        <button id="btn-pista-reto" ${quedanPistas <= 0 ? 'disabled' : ''}
            style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,213,74,.4);background:rgba(255,213,74,.08);color:#ffd54a;font-size:.8rem;cursor:${quedanPistas > 0 ? 'pointer' : 'default'};opacity:${quedanPistas > 0 ? 1 : 0.45};">
            💡 Pedir pista a TechBot (−1 punto) · quedan ${quedanPistas}
        </button>`

    el.querySelectorAll('[data-diag]').forEach(btn =>
        btn.addEventListener('click', () => diagnosticarReto(btn.getAttribute('data-diag'))))
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
        const m = modelos3D[id]
        if (m) { m.visible = false; pedirActualizarSombras() }
        PASOS.forEach(p => { if (p.marker) p.marker.visible = false })
        if (paso.marker) { paso.marker.visible = true; paso.marker.userData.intenso = true }

        appendLog(`✓ Diagnóstico correcto: ${paso.nombre}. Pieza retirada.`, 'success')
        droneHabla(`¡Diagnóstico correcto! ${M.reto.descripcionFalla} Retiré la pieza dañada: toma un repuesto de la vitrina.`)
        setHint(`<strong>✓ Falla encontrada: ${paso.nombre}.</strong> Toma el repuesto en la vitrina (clic) y luego haz clic en el disco luminoso.`)
        dibujarPantallaTaller()
        renderPanelReto()
    } else {
        M.erroresDiag++
        const info = M.reto.inspecciones[id]
        appendLog(`✗ Diagnóstico incorrecto: ${paso.nombre} (−2 puntos).`, 'warn')
        droneHabla(`No es ${paso.nombre}. ${info ? info.texto : 'Ese componente funciona correctamente.'} Sigue investigando.`)
        setHint(`<strong>✗ Incorrecto (−2 puntos).</strong> ${paso.nombre} no es la causa. Revisa las inspecciones con ⚠.`)
        actualizarNotaReto()
    }
}

function clicReto(e) {
    const M = modoReto
    if (!M || M.fase === 'brief' || M.fase === 'final') return
    setMouseDesdeEvento(e)
    raycaster.setFromCamera(mouse, camera)

    if (M.fase === 'inspeccion') {
        const hits = raycaster.intersectObjects(slotDiscs)
        if (hits.length) { inspeccionarReto(hits[0].object.userData.id); return }

        const sHits = raycaster.intersectObjects(shelfMeshes)
        if (sHits.length) {
            droneHabla('La vitrina es para los repuestos. Primero diagnostica cuál pieza está dañada.')
            return
        }
    } else if (M.fase === 'reparacion') {
        const fallaId = M.reto.componenteFalla

        const sHits = raycaster.intersectObjects(shelfMeshes)
        if (sHits.length) {
            const pasoId = sHits[0].object.userData.pasoId
            const paso = PASOS.find(p => p.id === pasoId)
            if (pasoId === fallaId) {
                M.piezaLista = true
                droneHabla(`Perfecto: ${paso.nombre} nuevo en mano. Ahora haz clic en el disco luminoso de la PC.`)
                setHint(`<strong>En mano: ${paso.nombre} (repuesto).</strong> Haz clic en el disco luminoso para instalarlo.`)
                appendLog(`Repuesto tomado: ${paso.nombre}`, 'info')
                renderPanelReto()
            } else {
                droneHabla(`Ese es ${paso.nombre}, pero la pieza dañada es ${PASOS.find(p => p.id === fallaId).nombre}.`)
            }
            return
        }

        const dHits = raycaster.intersectObjects(slotDiscs)
        if (dHits.find(h => h.object.userData.id === fallaId)) {
            if (!M.piezaLista) {
                droneHabla('Primero toma el repuesto de la vitrina (haz clic sobre la pieza).')
                return
            }
            instalarReemplazoReto()
            return
        }
    }

    if (propsInteractivos.length) {
        const pHits = raycaster.intersectObjects(propsInteractivos, true)
        if (pHits.length) {
            let obj = pHits[0].object
            while (obj && !obj.userData.fact) obj = obj.parent
            if (obj?.userData.fact) droneHabla(obj.userData.fact)
        }
    }
}

function instalarReemplazoReto() {
    const M = modoReto
    const paso = PASOS.find(p => p.id === M.reto.componenteFalla)
    M.fase = 'final'
    if (walkControls?.isLocked) walkControls.unlock()
    actualizarOverlayWalk()
    ocultarMarcador(paso.id)
    colocarModelo(paso, true)
    appendLog(`${paso.nombre} reemplazado. Encendiendo la PC…`, 'success')
    droneHabla('¡Pieza instalada! Encendiendo para verificar… POST correcto. ¡La PC funciona!')
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
    try {
        const resultados = guardado ? await obtenerResultadosRetos() : []

        const historial = resultados.length ? resultados : [{
            reto_id: r.id, nota, exito,
            errores_diagnostico: M.erroresDiag, pistas_usadas: M.pistasUsadas, segundos
        }]
        const candidatos = LOGROS_RETO.filter(l => l.condition(historial)).map(l => l.id)
        if (candidatos.length) {
            const previos = await obtenerLogrosUsuario()
            logrosNuevos = candidatos.filter(id => !previos.includes(id))
            if (logrosNuevos.length && guardado) await otorgarLogros(logrosNuevos, r.id)
        }
    } catch (_) {  }

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
