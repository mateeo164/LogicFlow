

const express = require('express')
const compression = require('compression')
const helmet = require('helmet')
const path = require('path')
const fs = require('fs')
const { GoogleGenAI } = require('@google/genai')

// Cargador mínimo de .env (sin dependencia): solo para desarrollo local, y
// nunca pisa variables que la plataforma de hosting ya haya inyectado.
try {
    const envPath = path.join(__dirname, '.env')
    if (fs.existsSync(envPath)) {
        fs.readFileSync(envPath, 'utf8').split('\n').forEach(linea => {
            const m = linea.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
            if (!m) return
            const clave = m[1]
            let valor = (m[2] || '').trim()
            if (valor.length >= 2 && ((valor[0] === '"' && valor.endsWith('"')) || (valor[0] === "'" && valor.endsWith("'")))) {
                valor = valor.slice(1, -1)
            }
            if (!(clave in process.env)) process.env[clave] = valor
        })
    }
} catch { /* sin .env — se usan las variables de entorno del sistema */ }

const app = express()
const PORT = process.env.PORT || 3000

// La mayoría de plataformas de hosting (Render, Railway, Fly, etc.) ponen la
// app detrás de un proxy TLS. Confiar en el primer proxy hace que Express lea
// bien el protocolo/IP reales (X-Forwarded-*).
app.set('trust proxy', 1)

const SUPABASE_HOST = 'https://kgyhbimpwwtnkiozymyr.supabase.co'

// Cabeceras de seguridad. La CSP permite inline scripts/styles porque el
// proyecto usa mucho <script> y style="" embebidos; wasm-unsafe-eval es
// necesario para el decodificador Draco (WebAssembly) del laboratorio 3D.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            // blob:/data: son necesarios para que GLTFLoader lea las texturas
            // embebidas de los modelos (las carga con fetch de una blob URL).
            connectSrc: ["'self'", 'blob:', 'data:', SUPABASE_HOST],
            frameSrc: ['https://www.youtube.com', 'https://www.youtube-nocookie.com'],
            workerSrc: ["'self'", 'blob:'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    // No bloquear la carga de recursos propios desde otras páginas ni romper
    // los iframes de YouTube.
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}))

// Compresión gzip/brotli para HTML/CSS/JS (no afecta a .bin/.png ya comprimidos).
app.use(compression())

// express.static sirve TODO __dirname si no se filtra antes: sin este bloqueo,
// cualquier visitante puede descargar este mismo servidor (server.cjs), el
// código fuente completo de node_modules/, el esquema y las políticas RLS de
// supabase/*.sql, los tests y la documentación interna con un simple GET.
// Los dotfiles (.env, .git, etc.) ya los protege express.static por defecto.
// req.path llega tal cual en la URL (sin decodificar %2f, %2e, etc.), pero
// express.static sí decodifica antes de resolver el archivo — sin decodificar
// y normalizar aquí primero, "/supabase%2ftutor-setup.sql" esquiva el regex
// y express.static igual sirve el archivo real.
const RUTA_PRIVADA = /^\/(node_modules|supabase|scripts|test|docs)(\/|$)|^\/(server\.cjs|package(-lock)?\.json|README\.md|SUPABASE\.md|DEBUG\.md|Procfile)$/i
app.use((req, res, next) => {
    let rutaDecodificada
    try {
        rutaDecodificada = decodeURIComponent(req.path)
    } catch {
        return res.status(400).end()
    }
    const rutaNormalizada = path.posix.normalize(rutaDecodificada)
    if (RUTA_PRIVADA.test(rutaNormalizada) || RUTA_PRIVADA.test(req.path)) return res.status(404).end()
    next()
})

app.use(express.static(__dirname, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
        // Modelos y texturas: cache larga e inmutable (contenido versionado por ruta).
        if (/[\\/](assets)[\\/].*\.(glb|gltf|bin|png|jpe?g|webp|ktx2)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
    }
}))

// Health-check para los monitores del proveedor de hosting.
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() })
})

// --------------------------------------------------------------------
// Tutor IA conversacional (Gemini) del laboratorio 3D.
// La API key vive solo en el servidor; el cliente nunca la ve.
// --------------------------------------------------------------------
const TUTOR_MODEL = 'gemini-2.5-flash'
const TUTOR_SYSTEM_PROMPT = `Eres el dron tutor de LogicFlow, un simulador educativo de ensamblaje de PC para estudiantes de bachillerato o inicios de universidad.
Responde siempre en español, en 2 a 4 frases, con tono cercano y claro, evitando tecnicismos innecesarios.
Si el mensaje trae un "[Contexto del simulador: ...]", úsalo para ajustar tu respuesta al paso o componente en el que está el estudiante.
Si preguntan algo que no tiene relación con hardware de PC o con el simulador, redirígelos amablemente al tema.
No reveles directamente la respuesta de un quiz o de un diagnóstico de falla: da pistas que ayuden a razonar, no la solución exacta.`

const TUTOR_RATE_WINDOW_MS = 60_000
const TUTOR_RATE_MAX = 15
const tutorRateBuckets = new Map()
setInterval(() => {
    const limite = Date.now() - TUTOR_RATE_WINDOW_MS * 5
    for (const [ip, bucket] of tutorRateBuckets) {
        if (bucket.inicio < limite) tutorRateBuckets.delete(ip)
    }
}, TUTOR_RATE_WINDOW_MS * 5).unref()

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

app.post('/api/tutor-chat', express.json({ limit: '4kb' }), async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'El tutor IA no está configurado en este servidor.' })
    }
    if (tutorRateLimitado(req.ip)) {
        return res.status(429).json({ error: 'Demasiadas preguntas seguidas. Espera un momento.' })
    }

    const pregunta = typeof req.body?.pregunta === 'string' ? req.body.pregunta.trim() : ''
    if (!pregunta) return res.status(400).json({ error: 'Escribe una pregunta.' })
    if (pregunta.length > 500) return res.status(400).json({ error: 'La pregunta es demasiado larga (máx. 500 caracteres).' })

    const contexto = typeof req.body?.contexto === 'string' ? req.body.contexto.trim().slice(0, 800) : ''
    const historialCrudo = Array.isArray(req.body?.historial) ? req.body.historial : []
    // Gemini usa role:'model' donde Anthropic usaría 'assistant'.
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
        res.json({ respuesta: texto || 'No tengo una respuesta para eso ahora mismo.' })
    } catch (err) {
        console.error('[tutor-chat]', err?.status || '', err?.message || err)
        res.status(502).json({ error: 'No se pudo contactar al tutor IA. Intenta de nuevo en un momento.' })
    }
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(PORT, () => {
    const env = process.env.NODE_ENV || 'development'
    console.log('\n  LogicFlow — Simulador de Ensamblaje')
    console.log(`  ▶ Entorno: ${env} | Puerto: ${PORT}`)
    if (env !== 'production') {
        console.log(`  ▶ Abre el navegador en: http://localhost:${PORT}`)
    }
    console.log('')
})
