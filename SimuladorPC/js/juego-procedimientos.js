
import * as THREE from 'three'
import { PASOS } from './pasos-data.js'
import { tweenProc, crearHotspot, crearNumeroLabel, crearTextoLabel, crearTrianguloProc, ponerTornillo, conectarCable } from './juego-proc-helpers.js'

export function construirProcedimientoCPU(P) {
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

export function construirProcedimientoMB(P) {
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
                            else { refrescar(); P.bloqueado = false; P.setHint(`<strong>Atornillar en cruz</strong> — quedan ${orden.length - next} tornillo(s).`) }
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

export function construirProcedimientoCooler(P) {
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
                            else { P.bloqueado = false; P.setHint('Engancha también el otro clip.') }
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

export function construirProcedimientoRAM(P) {
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
                            else { P.bloqueado = false; P.setHint('Abre también el clip del otro extremo.') }
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

export function construirProcedimientoGPU(P) {
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

export function construirProcedimientoPSU(P) {
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
        P.enfocarCamara(ft.clone().add(camOff), ft.clone().add(lookOff), 0.55)
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
