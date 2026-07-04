const PREF_KEY = 'logicflow_audio_muted'

let ctx = null
let masterGain = null
let ambientStarted = false
let muted = localStorage.getItem(PREF_KEY) === '1'

export function unlock() {
    if (!ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return
        ctx = new Ctx()
        masterGain = ctx.createGain()
        masterGain.gain.value = muted ? 0 : 0.5
        masterGain.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') ctx.resume()
    if (!ambientStarted) {
        startAmbient()
        ambientStarted = true
    }
}

function tone({ freq, type = 'sine', duration = 0.15, attack = 0.005, peak = 0.3, freqEnd = null, filterFreq = null }) {
    if (!ctx || muted) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + duration)

    const gain = ctx.createGain()
    const hold = Math.max(duration - attack - 0.05, 0.01)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(peak, now + attack)
    gain.gain.linearRampToValueAtTime(peak, now + attack + hold)
    gain.gain.linearRampToValueAtTime(0, now + attack + hold + 0.05)

    if (filterFreq) {
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = filterFreq
        osc.connect(filter)
        filter.connect(gain)
    } else {
        osc.connect(gain)
    }
    gain.connect(masterGain)
    osc.start(now)
    osc.stop(now + duration + 0.05)
}

export function click() {
    tone({ freq: 900, type: 'square', duration: 0.04, peak: 0.1, attack: 0.001 })
}

export function snap() {
    tone({ freq: 520, type: 'triangle', duration: 0.09, peak: 0.28, freqEnd: 340, attack: 0.002 })
}

export function success() {
    if (!ctx || muted) return
    ;[523.25, 659.25, 783.99].forEach((freq, i) => {
        setTimeout(() => tone({ freq, type: 'sine', duration: 0.18, peak: 0.2, attack: 0.005 }), i * 70)
    })
}

export function error() {
    tone({ freq: 220, type: 'sawtooth', duration: 0.25, peak: 0.16, freqEnd: 140, filterFreq: 800 })
}

export function complete() {
    if (!ctx || muted) return
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        setTimeout(() => tone({ freq, type: 'triangle', duration: 0.35, peak: 0.22, attack: 0.01 }), i * 110)
    })
}

export function footstep() {
    if (!ctx || muted) return
    const now = ctx.currentTime
    const size = Math.floor(ctx.sampleRate * 0.06)
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size)

    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 300
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.16, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(masterGain)
    noise.start(now)
}

function startAmbient() {
    const now = ctx.currentTime

    const osc1 = ctx.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = 55
    const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 55.6
    const droneFilter = ctx.createBiquadFilter(); droneFilter.type = 'lowpass'; droneFilter.frequency.value = 220
    const droneGain = ctx.createGain(); droneGain.gain.value = 0.045
    osc1.connect(droneFilter); osc2.connect(droneFilter); droneFilter.connect(droneGain); droneGain.connect(masterGain)
    osc1.start(now); osc2.start(now)

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1
    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = noiseBuffer
    noiseSource.loop = true
    const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 700; noiseFilter.Q.value = 0.6
    const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.02
    noiseSource.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain)
    noiseSource.start(now)

    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.015
    lfo.connect(lfoGain); lfoGain.connect(droneGain.gain)
    lfo.start(now)
}

export function isMuted() {
    return muted
}

export function setMuted(value) {
    muted = value
    localStorage.setItem(PREF_KEY, value ? '1' : '0')
    if (ctx && masterGain) {
        masterGain.gain.linearRampToValueAtTime(value ? 0 : 0.5, ctx.currentTime + 0.15)
    }
}

export function toggleMute() {
    setMuted(!muted)
    return muted
}
