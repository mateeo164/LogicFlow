

const express = require('express')
const compression = require('compression')
const helmet = require('helmet')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

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

app.use(express.static(__dirname, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
        // Modelos y texturas: cache larga e inmutable (contenido versionado por ruta).
        if (/[\\/](assets)[\\/].*\.(glb|gltf|bin|png|jpe?g|webp|ktx2)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
    }
}))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(PORT, () => {
    console.log('\n  LogicFlow — Simulador de Ensamblaje')
    console.log(`  ▶ Abre el navegador en: http://localhost:${PORT}\n`)
})
