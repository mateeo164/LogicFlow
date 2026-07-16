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

export function beep() {
    tone({ freq: 1180, type: 'square', duration: 0.14, peak: 0.14, attack: 0.002 })
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


const MUSIC_CHORDS = [
    [220.00, 261.63, 329.63, 392.00],
    [174.61, 220.00, 261.63, 329.63],
    [130.81, 164.81, 196.00, 246.94],
    [196.00, 246.94, 293.66, 349.23],
]
const MUSIC_CHORD_DURATION = 4.5
let musicTimer = null

function playPadChord(freqs, time, dur) {
    const attack = 1.2, release = 1.6
    const chordGain = ctx.createGain()
    chordGain.gain.setValueAtTime(0, time)
    chordGain.gain.linearRampToValueAtTime(0.045, time + attack)
    chordGain.gain.setValueAtTime(0.045, time + dur - release)
    chordGain.gain.linearRampToValueAtTime(0, time + dur)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    chordGain.connect(filter)
    filter.connect(masterGain)

    freqs.forEach((f, i) => {
        const osc = ctx.createOscillator()
        osc.type = i === 0 ? 'sine' : 'triangle'
        osc.frequency.value = f
        osc.connect(chordGain)
        osc.start(time)
        osc.stop(time + dur + 0.1)
    })
}

function playArpeggio(freqs, time, dur) {
    const noteDur = dur / freqs.length
    freqs.forEach((f, i) => {
        const noteTime = time + i * noteDur + noteDur * 0.15
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = f * 2
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 2200
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0, noteTime)
        gain.gain.linearRampToValueAtTime(0.03, noteTime + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + noteDur * 0.8)
        osc.connect(filter); filter.connect(gain); gain.connect(masterGain)
        osc.start(noteTime)
        osc.stop(noteTime + noteDur)
    })
}

function scheduleMusicLoop(startTime) {
    if (!ctx) return
    let t = startTime
    MUSIC_CHORDS.forEach(chord => {
        playPadChord(chord, t, MUSIC_CHORD_DURATION)
        playArpeggio(chord, t, MUSIC_CHORD_DURATION)
        t += MUSIC_CHORD_DURATION
    })
    const loopDuration = MUSIC_CHORD_DURATION * MUSIC_CHORDS.length
    const nextStart = startTime + loopDuration
    const delay = Math.max((nextStart - ctx.currentTime) * 1000 - 300, 100)
    musicTimer = setTimeout(() => scheduleMusicLoop(nextStart), delay)
}

function startAmbient() {
    scheduleMusicLoop(ctx.currentTime + 0.1)
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
