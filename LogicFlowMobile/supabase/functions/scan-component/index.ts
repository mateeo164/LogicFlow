// Supabase Edge Function: scan-component
// Recibe una foto (y opcionalmente audio) desde el Escáner AR de LogicFlow Mobile,
// la envía a Gemini (multimodal) y devuelve una identificación + respuesta hablable.
// La GEMINI_API_KEY vive solo aquí (secreto de servidor) — nunca en el cliente.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'

// Debe reflejar los ids/labels de src/constants/components.ts
const KNOWN_COMPONENTS = [
  { id: 'case', label: 'Gabinete (Case)', pista: 'torre/caja metálica con panel lateral y ventiladores' },
  { id: 'mb', label: 'Placa base (Motherboard)', pista: 'circuito grande verde/negro con slots, socket y ranuras de RAM' },
  { id: 'cpu', label: 'Procesador (CPU)', pista: 'chip pequeño cuadrado, cerámico/metálico, con pines o contactos dorados' },
  { id: 'cooler', label: 'Disipador (Cooler)', pista: 'bloque metálico con aletas y/o ventilador circular, a veces con tubos de cobre' },
  { id: 'ram', label: 'Memoria RAM', pista: 'tarjeta rectangular delgada y alargada con chips en fila' },
  { id: 'storage', label: 'Almacenamiento NVMe', pista: 'tarjeta pequeña tipo "chicle" con chips, sin cables' },
  { id: 'gpu', label: 'Tarjeta gráfica (GPU)', pista: 'tarjeta grande con ventiladores grandes y disipador masivo' },
  { id: 'power', label: 'Fuente de poder (PSU)', pista: 'caja metálica rectangular con ventilador y cables de salida' },
  { id: 'fans', label: 'Ventiladores de gabinete', pista: 'ventilador cuadrado con aspas y marco, a veces con LEDs RGB en el borde' },
  { id: 'hdd', label: 'Disco duro (HDD)', pista: 'caja metálica rectangular plana de 3.5", con etiqueta arriba y conectores SATA, más gruesa que un SSD' },
  { id: 'sata', label: 'Cable de datos SATA', pista: 'cable delgado y plano (rojo o negro) con conectores en forma de "L" en los extremos' },
]

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    componentId: { type: 'STRING', nullable: true, enum: KNOWN_COMPONENTS.map(c => c.id) },
    confidence: { type: 'NUMBER' },
    reply: { type: 'STRING' },
  },
  required: ['confidence', 'reply'],
}

interface ScanRequest {
  image: string // base64 JPEG, sin prefijo data:
  audio?: string // base64, pregunta hablada opcional
  audioMimeType?: string // ej. 'audio/m4a'
  installedIds?: string[]
  mode?: 'scan' | 'ask'
  componentId?: string // requerido cuando mode === 'ask'
}

function buildPrompt(body: ScanRequest): string {
  const catalogo = KNOWN_COMPONENTS
    .map(c => `- id="${c.id}" (${c.label}): ${c.pista}`)
    .join('\n')
  const instalados = (body.installedIds || []).join(', ') || 'ninguno todavía'

  if (body.mode === 'ask') {
    const actual = KNOWN_COMPONENTS.find(c => c.id === body.componentId)
    return `Eres un tutor experto en hardware de PC dentro de LogicFlow, una app educativa universitaria. ` +
      `El estudiante ya escaneó "${actual?.label || body.componentId}" y ahora te hace una pregunta de seguimiento por voz ` +
      `(está en el audio adjunto; transcríbela mentalmente, no la repitas). Usa también la imagen adjunta como referencia visual. ` +
      `Responde en español, en 2-4 frases, tono cercano y pedagógico, como si hablaras con un estudiante. ` +
      `Si la pregunta no tiene relación con hardware de PC, redirígelo amablemente al tema. ` +
      `Devuelve SOLO JSON: {"componentId": "${body.componentId}", "confidence": 1, "reply": "..."}.`
  }

  return `Eres un tutor experto en hardware de PC dentro de LogicFlow, una app educativa universitaria de ensamblaje de computadoras. ` +
    `El estudiante apuntó la cámara de su celular a un objeto y te envía la foto. Tu tarea es identificar cuál de estos ` +
    `componentes de PC es el que más probablemente se muestra:\n${catalogo}\n\n` +
    `Componentes que el estudiante ya instaló en esta sesión: ${instalados}.\n` +
    `Si además hay audio adjunto, es una pregunta o comentario hablado del estudiante sobre lo que ve — respóndela también.\n\n` +
    `REGLAS IMPORTANTES:\n` +
    `- Si la imagen NO muestra claramente un componente de PC (por ejemplo una cara, una pared, una mascota, un objeto random), ` +
    `responde con componentId=null, confidence bajo (0 a 0.3), y en "reply" explica amablemente que no reconoces un componente ` +
    `de PC en la imagen y pide reintentar apuntando a una pieza real. NUNCA inventes una coincidencia falsa.\n` +
    `- Si reconoces el componente con claridad, responde con su id exacto del catálogo, confidence alto (0.6 a 1), y en "reply" ` +
    `una explicación breve (2-4 frases), en español, tono cercano y pedagógico, apta para leerse en voz alta a un estudiante.\n` +
    `Devuelve SOLO el JSON con el esquema pedido, sin texto adicional.`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY no configurada en el servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: ScanRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!body.image) {
    return new Response(JSON.stringify({ error: 'Falta "image" (base64)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (body.mode === 'ask' && !body.componentId) {
    return new Response(JSON.stringify({ error: 'mode="ask" requiere "componentId"' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const parts: Record<string, unknown>[] = [
    { text: buildPrompt(body) },
    { inline_data: { mime_type: 'image/jpeg', data: body.image } },
  ]
  if (body.audio) {
    parts.push({ inline_data: { mime_type: body.audioMimeType || 'audio/m4a', data: body.audio } })
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.4,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('[scan-component] Gemini error:', geminiRes.status, errText)
      if (geminiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes de la IA alcanzado', code: 'rate_limited' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(JSON.stringify({ error: 'Error al consultar el modelo de IA' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await geminiRes.json()
    if (data?.usageMetadata) {
      console.log(`[scan-component] tokens mode=${body.mode || 'scan'} prompt=${data.usageMetadata.promptTokenCount} respuesta=${data.usageMetadata.candidatesTokenCount} total=${data.usageMetadata.totalTokenCount}`)
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.error('[scan-component] Respuesta sin texto:', JSON.stringify(data))
      return new Response(JSON.stringify({ error: 'El modelo no devolvió una respuesta' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const parsed = JSON.parse(text)
    const componentId = KNOWN_COMPONENTS.some(c => c.id === parsed.componentId) ? parsed.componentId : null

    return new Response(
      JSON.stringify({
        componentId,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
        reply: parsed.reply || '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[scan-component] Error inesperado:', err)
    return new Response(JSON.stringify({ error: 'Error interno procesando el escaneo' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
