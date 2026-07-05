// texturas.js
// Generadores de texturas procedurales (canvas 2D -> THREE.CanvasTexture) usados por
// el laboratorio 3D. Funciones puras y autocontenidas: no dependen del estado del motor.
import * as THREE from "three"

export function crearTexturaRadial(stops, size = 512) {
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

export function crearTexturaMadera(size = 1024) {
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

export function crearTexturaMaderaClara(size = 1024) {
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

export function crearTexturaLetreroComponentes() {
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

export function crearTexturaPisoModerno(size = 1024) {
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

export function crearTexturaPegboard(size = 512) {
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

export function crearTexturaMat(size = 512) {
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

export function crearTexturaEtiqueta(nombre) {
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

export function crearTexturaPared(size = 512) {
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

export function crearTexturaCielo() {
    const c = document.createElement('canvas')
    c.width = 512; c.height = 288
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, c.height)
    g.addColorStop(0, '#7db8e8'); g.addColorStop(0.62, '#bcd9ef'); g.addColorStop(1, '#e8ecd9')
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height)

    const sol = ctx.createRadialGradient(400, 66, 4, 400, 66, 70)
    sol.addColorStop(0, 'rgba(255,250,225,0.98)'); sol.addColorStop(0.25, 'rgba(255,244,200,0.75)')
    sol.addColorStop(1, 'rgba(255,244,200,0)')
    ctx.fillStyle = sol; ctx.fillRect(300, 0, 212, 170)

    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ;[[90, 80, 46], [150, 96, 34], [260, 60, 40], [210, 74, 28]].forEach(([x, y, r]) => {
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill()
    })

    ctx.fillStyle = '#6c8f5f'
    ctx.beginPath(); ctx.moveTo(0, 288)
    for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, 246 + Math.sin(x * 0.02) * 12)
    ctx.lineTo(512, 288); ctx.closePath(); ctx.fill()

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
}

export function crearTexturaCartel(size = 512) {
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

export function crearTexturaBlueprint(size = 512) {
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
