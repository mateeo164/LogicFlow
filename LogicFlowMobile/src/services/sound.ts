import AsyncStorage from '@react-native-async-storage/async-storage'
import { Directory, File, Paths } from 'expo-file-system'
import { createAudioPlayer } from 'expo-audio'
import { buildToneWav, ToneSpec } from '../utils/synthAudio'

const PREF_KEY = 'logicflow_sound_effects'
let enabled = true

export async function loadSoundPref(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(PREF_KEY)
  enabled = stored === null ? true : stored === '1'
  return enabled
}

export async function setSoundPref(value: boolean): Promise<void> {
  enabled = value
  await AsyncStorage.setItem(PREF_KEY, value ? '1' : '0')
}

export function isSoundEnabled(): boolean {
  return enabled
}

type SfxName = 'tap' | 'success' | 'error' | 'shutter' | 'complete'

const SFX_SPECS: Record<SfxName, ToneSpec[]> = {
  tap: [{ freq: 900, type: 'square', duration: 0.05, peak: 0.25 }],
  success: [
    { freq: 523.25, duration: 0.16, peak: 0.5 },
    { freq: 659.25, duration: 0.16, start: 0.07, peak: 0.5 },
    { freq: 783.99, duration: 0.2, start: 0.14, peak: 0.5 },
  ],
  error: [{ freq: 220, freqEnd: 140, type: 'sawtooth', duration: 0.25, peak: 0.35 }],
  shutter: [
    { freq: 1200, type: 'square', duration: 0.03, peak: 0.3 },
    { freq: 700, type: 'square', duration: 0.04, start: 0.05, peak: 0.25 },
  ],
  complete: [
    { freq: 523.25, duration: 0.3, peak: 0.5 },
    { freq: 659.25, duration: 0.3, start: 0.11, peak: 0.5 },
    { freq: 783.99, duration: 0.3, start: 0.22, peak: 0.5 },
    { freq: 1046.5, duration: 0.4, start: 0.33, peak: 0.5 },
  ],
}

const CACHE_DIR = new Directory(Paths.cache, 'logicflow-sfx')
let files: Partial<Record<SfxName, File>> = {}

function getFile(name: SfxName): File {
  const cached = files[name]
  if (cached) return cached

  if (!CACHE_DIR.exists) CACHE_DIR.create()
  const file = new File(CACHE_DIR, `${name}.wav`)
  if (!file.exists) {
    file.create()
    file.write(buildToneWav(SFX_SPECS[name]))
  }
  files[name] = file
  return file
}

function play(name: SfxName) {
  if (!enabled) return
  try {
    const file = getFile(name)
    const player = createAudioPlayer(file.uri)
    player.play()
    setTimeout(() => { try { player.remove() } catch { /* noop */ } }, 1500)
  } catch { /* el sonido nunca debe romper la interacción del usuario */ }
}

export const sfx = {
  tap: () => play('tap'),
  success: () => play('success'),
  error: () => play('error'),
  shutter: () => play('shutter'),
  complete: () => play('complete'),
}
