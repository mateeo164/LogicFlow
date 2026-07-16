(function () {
    const MAX_HISTORIAL_ENVIADO = 6
    const MAX_PREGUNTA = 500

    function contextoActual() {
        const partes = []
        const mision = document.getElementById('mission-title')?.textContent?.trim()
        const instruccion = document.getElementById('instruction-p')?.textContent?.trim()
        const specs = document.getElementById('specs-content')?.textContent?.trim().replace(/\s+/g, ' ')
        if (mision) partes.push(`Paso actual: ${mision}`)
        if (instruccion) partes.push(`Instrucción: ${instruccion}`)
        if (specs && !specs.includes('Selecciona una pieza')) partes.push(`Ficha técnica visible: ${specs.slice(0, 400)}`)
        return partes.join(' | ').slice(0, 800)
    }

    function crearWidget() {
        const fab = document.createElement('button')
        fab.type = 'button'
        fab.id = 'ia-tutor-fab'
        fab.className = 'ia-tutor-fab'
        fab.setAttribute('aria-label', 'Abrir tutor IA')
        fab.title = 'Pregúntale al tutor IA'
        fab.textContent = '💬'

        const panel = document.createElement('div')
        panel.id = 'ia-tutor-panel'
        panel.className = 'ia-tutor-panel'
        panel.hidden = true
        panel.innerHTML = `
            <div class="ia-tutor-panel__head">
                <span>🤖 Tutor IA</span>
                <button type="button" class="ia-tutor-panel__close" aria-label="Cerrar">✕</button>
            </div>
            <div class="ia-tutor-panel__msgs" id="ia-tutor-msgs">
                <div class="ia-tutor-msg ia-tutor-msg--bot">Hola, soy tu tutor de hardware. Pregúntame lo que sea sobre la pieza o el paso en el que estás.</div>
            </div>
            <form class="ia-tutor-panel__form" id="ia-tutor-form">
                <input type="text" id="ia-tutor-input" maxlength="${MAX_PREGUNTA}" placeholder="Escribe tu pregunta…" autocomplete="off">
                <button type="submit" id="ia-tutor-send">Enviar</button>
            </form>
        `

        document.body.appendChild(fab)
        document.body.appendChild(panel)

        const msgsEl = panel.querySelector('#ia-tutor-msgs')
        const form = panel.querySelector('#ia-tutor-form')
        const input = panel.querySelector('#ia-tutor-input')
        const sendBtn = panel.querySelector('#ia-tutor-send')
        const historial = []

        function agregarMensaje(rol, texto) {
            const div = document.createElement('div')
            div.className = `ia-tutor-msg ia-tutor-msg--${rol === 'user' ? 'user' : 'bot'}`
            div.textContent = texto
            msgsEl.appendChild(div)
            msgsEl.scrollTop = msgsEl.scrollHeight
            return div
        }

        function abrir() {
            panel.hidden = false
            fab.classList.add('is-active')
            setTimeout(() => input.focus(), 50)
        }
        function cerrar() {
            panel.hidden = true
            fab.classList.remove('is-active')
        }

        fab.addEventListener('click', () => { panel.hidden ? abrir() : cerrar() })
        panel.querySelector('.ia-tutor-panel__close').addEventListener('click', cerrar)

        form.addEventListener('submit', async (e) => {
            e.preventDefault()
            const pregunta = input.value.trim()
            if (!pregunta) return

            agregarMensaje('user', pregunta)
            historial.push({ rol: 'user', texto: pregunta })
            input.value = ''
            input.disabled = true
            sendBtn.disabled = true
            const pensando = agregarMensaje('bot', 'Pensando…')
            pensando.classList.add('ia-tutor-msg--pensando')

            try {
                const resp = await fetch('/api/tutor-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pregunta,
                        contexto: contextoActual(),
                        historial: historial.slice(0, -1).slice(-MAX_HISTORIAL_ENVIADO)
                    })
                })
                const data = await resp.json().catch(() => ({}))
                pensando.remove()
                if (!resp.ok) {
                    agregarMensaje('bot', data?.error || 'No se pudo contactar al tutor IA.')
                    return
                }
                const respuesta = data?.respuesta || 'No tengo una respuesta para eso ahora mismo.'
                agregarMensaje('bot', respuesta)
                historial.push({ rol: 'assistant', texto: respuesta })
            } catch (err) {
                pensando.remove()
                agregarMensaje('bot', 'No se pudo contactar al tutor IA. Revisa tu conexión.')
            } finally {
                input.disabled = false
                sendBtn.disabled = false
                input.focus()
            }
        })
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', crearWidget)
    } else {
        crearWidget()
    }
})()
