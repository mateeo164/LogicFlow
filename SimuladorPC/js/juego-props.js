
import * as THREE from 'three'


export function meshEntre(p1, p2, radio, mat) {
    const dir = new THREE.Vector3().subVectors(p2, p1)
    const len = dir.length()
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, len, 18), mat)
    m.position.copy(p1).lerp(p2, 0.5)
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    m.castShadow = true
    return m
}

export function crearLampara() {
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

export function crearCajaHerramientas() {
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

export function crearDestornillador() {
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

export function crearTaza() {
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

export function crearBobinaCable() {
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
