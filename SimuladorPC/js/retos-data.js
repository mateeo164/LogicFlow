export const NOTA_MINIMA_RETO = 7

export const RETOS = [
    {
        id: 'no-enciende',
        icono: '🔌',
        titulo: 'La PC no enciende',
        dificultad: 1,
        cliente: 'Presiono el botón de encendido y no pasa absolutamente nada: ni luces, ni ventiladores, ni un solo ruido.',
        sintomas: [
            'Al presionar el botón de encendido no ocurre nada',
            'Ningún LED del gabinete ni de la placa se ilumina',
            'Los ventiladores no giran ni un instante',
            'El cable de pared y el toma corriente ya fueron descartados'
        ],
        componenteFalla: 'power',
        descripcionFalla: 'La fuente de poder está dañada: su protección interna se disparó de forma permanente y no entrega voltaje.',
        explicacion: 'Cuando una PC está completamente muerta (sin LEDs ni ventiladores) y ya descartaste el toma corriente, la primera sospechosa es la fuente de poder: es la única pieza que convierte la energía de la pared para todo el sistema. El LED de standby de la placa base apagado lo confirma.',
        inspecciones: {
            case:    { anomalo: false, texto: 'El botón de encendido y sus cables del panel frontal están bien conectados a la placa. Sin daños visibles.' },
            mb:      { anomalo: false, texto: 'El LED de standby de la placa está APAGADO. La placa no recibe energía… la placa en sí no muestra daños ni capacitores hinchados.' },
            cpu:     { anomalo: false, texto: 'El procesador está bien asentado y sin marcas. No se puede probar sin energía.' },
            cooler:  { anomalo: false, texto: 'El disipador está firme y su cable conectado a CPU_FAN. Nada anormal.' },
            ram:     { anomalo: false, texto: 'Los módulos están bien insertados, con los seguros cerrados.' },
            storage: { anomalo: false, texto: 'El SSD M.2 está atornillado correctamente en su slot.' },
            gpu:     { anomalo: false, texto: 'La GPU está firme en el slot PCIe y con su cable de poder conectado.' },
            power:   { anomalo: true,  texto: '⚠ Con el probador de fuentes conectado al ATX de 24 pines, la fuente NO arranca y huele levemente a quemado. El test de clip (puente PS_ON) tampoco la enciende.' }
        },
        pistas: [
            'Si no hay NINGUNA señal de vida, sigue el camino de la energía: pared → fuente → placa.',
            'Fíjate en la inspección de la placa base: ¿su LED de standby está encendido? Ese LED depende directamente de la fuente.'
        ]
    },
    {
        id: 'sin-video',
        icono: '🖥️',
        titulo: 'Enciende pero no da video',
        dificultad: 2,
        cliente: 'La PC prende, los ventiladores giran y se escuchan unos pitidos raros, pero el monitor se queda en negro.',
        sintomas: [
            'Los ventiladores giran y los LED encienden',
            'La placa emite 3 pitidos largos y repetidos al arrancar',
            'El monitor queda en negro ("sin señal")',
            'El problema empezó después de que el cliente movió la PC de casa'
        ],
        componenteFalla: 'ram',
        descripcionFalla: 'Un módulo de RAM quedó dañado por una descarga al transportar la PC. La placa no pasa el POST de memoria.',
        explicacion: 'Los códigos de beep son el idioma de la placa base: en la mayoría de BIOS, los pitidos largos y repetidos significan FALLA DE MEMORIA RAM. Sin RAM funcional la placa ni siquiera intenta enviar video: el POST se detiene antes.',
        inspecciones: {
            case:    { anomalo: false, texto: 'Gabinete en buen estado; el transporte no dejó golpes visibles.' },
            mb:      { anomalo: false, texto: 'La placa enciende y emite 3 PITIDOS LARGOS repetidos. El LED de diagnóstico "DRAM" queda fijo en rojo.' },
            cpu:     { anomalo: false, texto: 'El CPU calienta ligeramente (señal de que arranca) y está bien asentado.' },
            cooler:  { anomalo: false, texto: 'El ventilador del disipador gira con normalidad.' },
            ram:     { anomalo: true,  texto: '⚠ Probando los módulos de uno en uno: con el módulo A la PC arranca y da video; con el módulo B vuelven los 3 pitidos. El módulo B está dañado.' },
            storage: { anomalo: false, texto: 'El SSD está firme; de todas formas el POST falla antes de llegar a buscar el disco.' },
            gpu:     { anomalo: false, texto: 'La GPU está bien insertada y sus ventiladores giran al encender. Se probó también la salida de video de la placa: tampoco da señal.' },
            power:   { anomalo: false, texto: 'Voltajes de la fuente correctos: 12.1 V, 5.05 V y 3.32 V medidos con multímetro.' }
        },
        pistas: [
            'Los pitidos al arrancar son un código: cuenta cuántos son y si son largos o cortos.',
            'En la inspección de la placa hay un LED de diagnóstico encendido. ¿Qué palabra tiene al lado?'
        ]
    },
    {
        id: 'se-apaga',
        icono: '🔥',
        titulo: 'Se apaga sola a los minutos',
        dificultad: 2,
        cliente: 'La PC prende y funciona, pero a los 5 o 10 minutos se apaga de golpe. Si la vuelvo a prender enseguida, se apaga aún más rápido.',
        sintomas: [
            'Arranca y da video con normalidad',
            'Tras unos minutos de uso se apaga de golpe, sin pantalla azul',
            'Recién apagada, vuelve a apagarse más rápido si se enciende de nuevo',
            'El software reportaba 96 °C en el CPU antes del último apagón'
        ],
        componenteFalla: 'cooler',
        descripcionFalla: 'El ventilador del disipador está trabado y la pasta térmica reseca: el CPU se protege apagando el sistema al superar su temperatura límite.',
        explicacion: 'Un apagado súbito que se repite más rápido cuando el equipo está caliente es el clásico APAGADO TÉRMICO: el CPU se autoprotege. La causa casi siempre está en la refrigeración: ventilador del disipador detenido, pasta seca o disipador flojo.',
        inspecciones: {
            case:    { anomalo: false, texto: 'Los ventiladores del gabinete giran, aunque hay bastante polvo acumulado.' },
            mb:      { anomalo: false, texto: 'La placa registra en el BIOS un apagado por "CPU Over Temperature Error".' },
            cpu:     { anomalo: false, texto: 'El CPU funciona, pero al tacto la zona del socket quema. Está bien asentado.' },
            cooler:  { anomalo: true,  texto: '⚠ El ventilador del disipador NO gira: está trabado con pelusa. Al retirar el disipador, la pasta térmica está completamente seca y agrietada.' },
            ram:     { anomalo: false, texto: 'Memorias correctas: pasan el test de memoria sin errores.' },
            storage: { anomalo: false, texto: 'El SSD reporta 42 °C, temperatura normal. SMART sin errores.' },
            gpu:     { anomalo: false, texto: 'La GPU se mantiene a 55 °C bajo carga. Sus ventiladores giran bien.' },
            power:   { anomalo: false, texto: 'La fuente entrega voltajes estables incluso bajo carga; su ventilador gira.' }
        },
        pistas: [
            'El dato de los 96 °C es oro: ¿qué componente se encarga de que el CPU no llegue a esa temperatura?',
            'Observa la inspección del disipador: ¿su ventilador gira? ¿En qué estado está la pasta térmica?'
        ]
    },
    {
        id: 'artefactos',
        icono: '🎨',
        titulo: 'Rayas y artefactos en pantalla',
        dificultad: 3,
        cliente: 'Al jugar aparecen rayas de colores, triángulos gigantes y cuadritos por toda la pantalla. A veces el juego se congela y el driver se reinicia.',
        sintomas: [
            'Rayas, puntos y polígonos de colores durante juegos y video',
            'El driver de video se reinicia ("dejó de responder y se recuperó")',
            'En el escritorio casi no se nota; empeora con carga gráfica',
            'Los artefactos aparecen también en el menú del BIOS'
        ],
        componenteFalla: 'gpu',
        descripcionFalla: 'La memoria VRAM de la tarjeta gráfica está dañada: los artefactos aparecen incluso en el BIOS, descartando drivers y software.',
        explicacion: 'Los artefactos visuales son la firma de la GPU. La prueba definitiva: si aparecen TAMBIÉN en el BIOS (antes de cargar Windows y drivers), el software queda descartado y la falla es física, casi siempre en la VRAM de la tarjeta.',
        inspecciones: {
            case:    { anomalo: false, texto: 'El flujo de aire del gabinete es correcto; nada bloquea las rejillas.' },
            mb:      { anomalo: false, texto: 'El slot PCIe está limpio y sin pines dañados. Probando la GPU en el segundo slot, los artefactos continúan.' },
            cpu:     { anomalo: false, texto: 'El CPU pasa una hora de prueba de estrés sin errores ni apagados.' },
            cooler:  { anomalo: false, texto: 'Temperaturas del CPU normales: 65 °C bajo carga.' },
            ram:     { anomalo: false, texto: 'MemTest completo sin errores: la RAM del sistema está sana.' },
            storage: { anomalo: false, texto: 'Verificación de archivos del juego correcta; el disco no reporta errores.' },
            gpu:     { anomalo: true,  texto: '⚠ Los artefactos aparecen INCLUSO en el menú del BIOS y en otra PC de prueba. La VRAM está dañada: la tarjeta necesita reemplazo.' },
            power:   { anomalo: false, texto: 'Los rieles de 12 V se mantienen estables bajo carga gráfica.' }
        },
        pistas: [
            'Los artefactos aparecen en el BIOS, donde no hay drivers cargados. ¿Qué descarta eso?',
            '¿Qué componente dibuja TODO lo que ves en pantalla, incluso el BIOS?'
        ]
    }
]

export const LOGROS_RETO = [
    {
        id: 'primer_diagnostico',
        titulo: 'Primer diagnóstico',
        descripcion: 'Superaste tu primer reto de reparación.',
        icono: '🩺',
        condition: (resultados) => resultados.some(r => r.exito)
    },
    {
        id: 'ojo_clinico',
        titulo: 'Ojo clínico',
        descripcion: 'Diagnosticaste la falla al primer intento.',
        icono: '🎯',
        condition: (resultados) => resultados.some(r => r.exito && r.errores_diagnostico === 0)
    },
    {
        id: 'sin_ayuda',
        titulo: 'Sin manual',
        descripcion: 'Superaste un reto sin usar ninguna pista.',
        icono: '🧭',
        condition: (resultados) => resultados.some(r => r.exito && r.pistas_usadas === 0)
    },
    {
        id: 'contrarreloj',
        titulo: 'Contrarreloj',
        descripcion: 'Reparaste una PC en menos de 3 minutos.',
        icono: '⏱️',
        condition: (resultados) => resultados.some(r => r.exito && r.segundos > 0 && r.segundos < 180)
    },
    {
        id: 'tecnico_de_taller',
        titulo: 'Técnico de taller',
        descripcion: 'Superaste los 4 retos de reparación.',
        icono: '🛠️',
        condition: (resultados) => {
            const superados = new Set(resultados.filter(r => r.exito).map(r => r.reto_id))
            return RETOS.every(rt => superados.has(rt.id))
        }
    },
    {
        id: 'nota_perfecta',
        titulo: 'Reparación impecable',
        descripcion: 'Obtuviste 10/10 en un reto.',
        icono: '💎',
        condition: (resultados) => resultados.some(r => r.exito && Number(r.nota) >= 10)
    }
]

export function calcularNotaReto({ erroresDiagnostico = 0, pistasUsadas = 0, segundos = 0 }) {
    let nota = 10
    nota -= erroresDiagnostico * 2
    nota -= pistasUsadas * 1
    if (segundos > 360) nota -= 1
    return Math.max(0, Math.min(10, nota))
}

export function obtenerReto(id) {
    return RETOS.find(r => r.id === id) || null
}
