import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface ScanResult {
  componentId: string | null
  confidence: number
  reply: string
}

export class RateLimitedError extends Error {
  constructor(message = 'El escáner está muy solicitado ahora mismo.') {
    super(message)
    this.name = 'RateLimitedError'
  }
}

interface ScanParams {
  imageBase64: string
  audioBase64?: string
  audioMimeType?: string
  installedIds?: string[]
}

interface AskParams {
  imageBase64: string
  audioBase64: string
  audioMimeType?: string
  componentId: string
}

async function invokeScanComponent(payload: Record<string, unknown>): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke('scan-component', { body: payload })
  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 429) {
      throw new RateLimitedError()
    }
    throw error
  }
  if (data?.error) throw new Error(data.error)
  return data as ScanResult
}

export function detectarComponente({ imageBase64, audioBase64, audioMimeType, installedIds }: ScanParams) {
  return invokeScanComponent({
    mode: 'scan',
    image: imageBase64,
    audio: audioBase64,
    audioMimeType,
    installedIds: installedIds || [],
  })
}

export function preguntarSobreComponente({ imageBase64, audioBase64, audioMimeType, componentId }: AskParams) {
  return invokeScanComponent({
    mode: 'ask',
    image: imageBase64,
    audio: audioBase64,
    audioMimeType,
    componentId,
  })
}
