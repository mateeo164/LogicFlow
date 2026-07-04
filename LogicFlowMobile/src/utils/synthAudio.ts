// Generador de audio sintético (sin archivos externos): produce bytes WAV (PCM16 mono)
// a partir de especificaciones simples de tono. Usado para los efectos de sonido de la app.

export interface ToneSpec {
  freq: number
  duration: number
  start?: number
  type?: 'sine' | 'square' | 'sawtooth' | 'triangle'
  peak?: number
  freqEnd?: number
}

const SAMPLE_RATE = 22050

function waveform(type: ToneSpec['type'], phase: number): number {
  const cycles = phase / (2 * Math.PI)
  switch (type) {
    case 'square': return Math.sign(Math.sin(phase)) || 1
    case 'sawtooth': return 2 * (cycles - Math.floor(cycles + 0.5))
    case 'triangle': return 2 * Math.abs(2 * (cycles - Math.floor(cycles + 0.5))) - 1
    default: return Math.sin(phase)
  }
}

function synthesizeTones(specs: ToneSpec[]): Float32Array {
  const totalDuration = specs.reduce((max, s) => Math.max(max, (s.start || 0) + s.duration), 0)
  const totalSamples = Math.ceil(totalDuration * SAMPLE_RATE) + 1
  const buffer = new Float32Array(totalSamples)

  for (const spec of specs) {
    const { freq, freqEnd, duration, start = 0, type = 'sine', peak = 0.3 } = spec
    const n = Math.floor(duration * SAMPLE_RATE)
    const startSample = Math.floor(start * SAMPLE_RATE)
    const attackN = Math.max(1, Math.floor(0.005 * SAMPLE_RATE))
    const releaseN = Math.max(1, Math.floor(0.05 * SAMPLE_RATE))
    let phase = 0

    for (let i = 0; i < n; i++) {
      const idx = startSample + i
      if (idx >= buffer.length) break
      const f = freqEnd ? freq + (freqEnd - freq) * (i / n) : freq
      phase += (2 * Math.PI * f) / SAMPLE_RATE

      let env = 1
      if (i < attackN) env = i / attackN
      else if (i > n - releaseN) env = Math.max(0, (n - i) / releaseN)

      buffer[idx] += waveform(type, phase) * env * peak
    }
  }

  for (let i = 0; i < buffer.length; i++) buffer[i] = Math.max(-1, Math.min(1, buffer[i]))
  return buffer
}

function floatTo16BitPCM(samples: Float32Array): Uint8Array {
  const out = new Uint8Array(samples.length * 2)
  const view = new DataView(out.buffer)
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return out
}

function writeAscii(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

function buildWavBytes(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const blockAlign = 2 // mono, 16-bit
  const byteRate = sampleRate * blockAlign
  const bytes = new Uint8Array(44 + pcm.length)
  const view = new DataView(bytes.buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + pcm.length, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true) // bits per sample
  writeAscii(view, 36, 'data')
  view.setUint32(40, pcm.length, true)
  bytes.set(pcm, 44)

  return bytes
}

export function buildToneWav(specs: ToneSpec[]): Uint8Array {
  return buildWavBytes(floatTo16BitPCM(synthesizeTones(specs)), SAMPLE_RATE)
}
