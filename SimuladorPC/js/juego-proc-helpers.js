
import * as THREE from 'three'

export function tweenProc(applyFn, from, to, ms, done) {
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

export function crearHotspot(color = 0x3a8bff, r = 0.028) {
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

export function crearNumeroLabel(n) {
    const c = document.createElement('canvas'); c.width = c.height = 64
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#ffd54a'; ctx.font = 'bold 46px Inter, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(n), 32, 35)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
    return new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
}

export function crearTextoLabel(texto, ancho = 0.15, color = '#cfe3ff') {
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

export function crearTrianguloProc(color = 0xffd54a, s = 0.014) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, s, 0, -s * 0.9, -s * 0.7, 0, s * 0.9, -s * 0.7, 0], 3))
    geo.computeVertexNormals()
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, side: THREE.DoubleSide }))
}

export function ponerTornillo(G, x, y, s = 1) {
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

export function conectarCable(G, a, b) {
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
