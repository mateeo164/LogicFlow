

const express = require('express')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.static(__dirname, { extensions: ['html'] }))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(PORT, () => {
    console.log('\n  LogicFlow — Simulador de Ensamblaje')
    console.log(`  ▶ Abre el navegador en: http://localhost:${PORT}\n`)
})
