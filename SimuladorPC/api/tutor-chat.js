import { GoogleGenAI } from '@google/genai'

const TUTOR_MODEL = 'gemini-2.5-flash'
const TUTOR_SYSTEM_PROMPT = `Eres el dron tutor de LogicFlow, un simulador educativo de ensamblaje de PC para estudiantes de bachillerato o inicios de universidad.
Responde siempre en español, en 2 a 4 frases, con tono cercano y claro, evitando tecnicismos innecesarios.
Si el mensaje trae un "[Contexto del simulador: ...]", úsalo para ajustar tu respuesta al paso o componente en el que está el estudiante.
Si preguntan algo que no tiene relación con hardware de PC o con el simulador, redirígelos amablemente al tema.
No reveles directamente la respuesta de un quiz o de un diagnóstico de falla: da pistas que ayuden a razonar, no la solución exacta.`

const TUTOR_RATE_WINDOW_MS = 60_000
const TUTOR_RATE_MAX = 15
const tutorRateBuckets = new Map()

function tutorRateLimitado(ip) {
    const ahora = Date.now()
    const bucket = tutorRateBuckets.get(ip)
    if (!bucket || ahora - bucket.inicio > TUTOR_RATE_WINDOW_MS) {
        tutorRateBuckets.set(ip, { inicio: ahora, conteo: 1 })
        return false
    }
    bucket.conteo++
    return bucket.conteo > TUTOR_RATE_MAX
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido.' })
    }
    if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'El tutor IA no está configurado en este servidor.' })
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'desconocida').split(',')[0].trim()
    if (tutorRateLimitado(ip)) {
        return res.status(429).json({ error: 'Demasiadas preguntas seguidas. Espera un momento.' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const pregunta = typeof body.pregunta === 'string' ? body.pregunta.trim() : ''
    if (!pregunta) return res.status(400).json({ error: 'Escribe una pregunta.' })
    if (pregunta.length > 500) return res.status(400).json({ error: 'La pregunta es demasiado larga (máx. 500 caracteres).' })

    const contexto = typeof body.contexto === 'string' ? body.contexto.trim().slice(0, 800) : ''
    const historialCrudo = Array.isArray(body.historial) ? body.historial : []
    const historial = historialCrudo
        .slice(-6)
        .filter(m => m && (m.rol === 'user' || m.rol === 'assistant') && typeof m.texto === 'string')
        .map(m => ({ role: m.rol === 'assistant' ? 'model' : 'user', parts: [{ text: m.texto.slice(0, 500) }] }))

    const contents = [
        ...historial,
        { role: 'user', parts: [{ text: contexto ? `[Contexto del simulador: ${contexto}]\n\n${pregunta}` : pregunta }] }
    ]

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
        const respuesta = await ai.models.generateContent({
            model: TUTOR_MODEL,
            contents,
            config: {
                systemInstruction: TUTOR_SYSTEM_PROMPT,
                maxOutputTokens: 500
            }
        })
        const texto = respuesta.text?.trim()
        res.status(200).json({ respuesta: texto || 'No tengo una respuesta para eso ahora mismo.' })
    } catch (err) {
        console.error('[tutor-chat]', err?.status || '', err?.message || err)
        res.status(502).json({ error: 'No se pudo contactar al tutor IA. Intenta de nuevo en un momento.' })
    }
}
