// quiz-data.js
// Evaluación formativa del laboratorio 3D.
// - PREGUNTAS_COMPONENTE: una micro-pregunta conceptual por componente, que aparece
//   justo después de instalarlo. La retroalimentación explica el PORQUÉ (no solo el qué).
// - EVALUACION: banco de preguntas para el pre-test y el post-test (misma prueba antes y
//   después) que permite medir la ganancia de aprendizaje.
// Este módulo es datos puros + funciones puras: se puede probar sin navegador.

export const PREGUNTAS_COMPONENTE = {
    case: {
        pregunta: 'Además de organizar los componentes, ¿cuál es la función principal del gabinete?',
        opciones: [
            'Protegerlos del polvo y los golpes, y guiar el flujo de aire',
            'Procesar las instrucciones de los programas',
            'Convertir la corriente del enchufe en energía',
            'Almacenar el sistema operativo y los archivos'
        ],
        correcta: 0,
        explica: 'El gabinete es la estructura que protege las piezas y, con su diseño de flujo de aire, ayuda a mantenerlas frías. Procesar, alimentar y almacenar son tareas del CPU, la fuente y el SSD.'
    },
    mb: {
        pregunta: '¿Por qué se dice que la placa base es el "núcleo" del sistema?',
        opciones: [
            'Porque es la pieza más cara',
            'Porque conecta y comunica todos los componentes entre sí',
            'Porque realiza todos los cálculos',
            'Porque enfría al procesador'
        ],
        correcta: 1,
        explica: 'La placa base es el punto de conexión común: CPU, RAM, GPU, almacenamiento y fuente se enlazan a través de ella. No calcula (eso es el CPU) ni enfría (eso es el disipador).'
    },
    cpu: {
        pregunta: '¿Para qué sirve el triángulo dorado marcado en una esquina del procesador?',
        opciones: [
            'Es solo decorativo, marca la marca del fabricante',
            'Indica el lado por donde entra la corriente',
            'Indica la orientación correcta para alinearlo con el socket',
            'Señala dónde aplicar la pasta térmica'
        ],
        correcta: 2,
        explica: 'El triángulo dorado debe coincidir con la marca del socket. Colocar el CPU en la orientación equivocada puede doblar sus pines/contactos y dañarlo permanentemente.'
    },
    cooler: {
        pregunta: 'Si enciendes la PC con el CPU pero SIN disipador ni pasta térmica, ¿qué ocurre?',
        opciones: [
            'Funciona igual, solo hace más ruido',
            'El CPU se sobrecalienta y el sistema se apaga para protegerse',
            'La RAM deja de detectarse',
            'La GPU pierde rendimiento'
        ],
        correcta: 1,
        explica: 'El CPU genera mucho calor. Sin refrigeración alcanza su temperatura límite en segundos y se apaga (apagado térmico) para no dañarse. La pasta térmica mejora la transferencia de calor al disipador.'
    },
    ram: {
        pregunta: '¿Por qué la memoria RAM suele instalarse en pares y en ranuras del mismo color?',
        opciones: [
            'Para que la PC se vea más simétrica',
            'Porque un solo módulo no funciona',
            'Para activar el modo Dual Channel y duplicar el ancho de banda',
            'Para repartir el calor entre las ranuras'
        ],
        correcta: 2,
        explica: 'Instalar los módulos en pareja (ranuras del mismo color) activa Dual Channel, que duplica el ancho de banda entre el CPU y la RAM y mejora el rendimiento. Un solo módulo funciona, pero en Single Channel.'
    },
    storage: {
        pregunta: '¿Cuál es la ventaja principal de un SSD NVMe frente a un disco duro mecánico (HDD)?',
        opciones: [
            'Almacena muchos más terabytes siempre',
            'Es mucho más rápido y no tiene partes móviles',
            'No necesita formatearse nunca',
            'Consume más energía a cambio de más velocidad'
        ],
        correcta: 1,
        explica: 'El SSD NVMe es varias decenas de veces más rápido que un HDD y, al no tener partes móviles, es más silencioso y resistente. Por eso el sistema arranca en pocos segundos.'
    },
    gpu: {
        pregunta: '¿En qué ranura de la placa base se instala la tarjeta gráfica?',
        opciones: [
            'En una ranura de RAM (DDR4)',
            'En el socket del CPU',
            'En el slot M.2',
            'En el slot PCIe ×16'
        ],
        correcta: 3,
        explica: 'La GPU se inserta en el slot PCIe ×16 (el más largo). Las ranuras DDR4 son para RAM, el socket es para el CPU y el M.2 es para el SSD.'
    },
    power: {
        pregunta: '¿Qué hace exactamente la fuente de poder (PSU) en la PC?',
        opciones: [
            'Guarda la energía en una batería interna',
            'Convierte la corriente del enchufe en voltajes estables para cada componente',
            'Regula la velocidad del procesador',
            'Refrigera todo el sistema'
        ],
        correcta: 1,
        explica: 'La fuente transforma la corriente alterna del enchufe en las corrientes continuas (12V, 5V, 3.3V) que necesitan los componentes, y sus protecciones evitan daños por picos o cortocircuitos.'
    },
    fans: {
        pregunta: '¿Por qué importa la dirección en la que giran los ventiladores del gabinete?',
        opciones: [
            'No importa, todos empujan aire igual',
            'Define si entran aire frío o expulsan el aire caliente, creando el flujo',
            'Determina la velocidad del procesador',
            'Sirve solo para la iluminación RGB'
        ],
        correcta: 1,
        explica: 'La orientación marca el flujo de aire: unos ventiladores meten aire frío (frente) y otros sacan el caliente (atrás/arriba). Un buen flujo mantiene bajas las temperaturas de todo el sistema.'
    },
    hdd: {
        pregunta: '¿Cuál es la principal ventaja del disco duro (HDD) frente al SSD?',
        opciones: [
            'Es mucho más rápido',
            'No tiene partes móviles',
            'Ofrece mucha más capacidad por el mismo precio',
            'Arranca el sistema operativo más rápido'
        ],
        correcta: 2,
        explica: 'El HDD es más lento que un SSD, pero cuesta mucho menos por cada gigabyte, así que es ideal para almacenamiento masivo (archivos, fotos, respaldos). Por velocidad, el SO conviene en el SSD.'
    },
    sata: {
        pregunta: '¿Qué transporta el cable de datos SATA?',
        opciones: [
            'La energía de la fuente hacia el disco',
            'Los datos entre el disco y la placa base',
            'La señal de video hacia el monitor',
            'La refrigeración líquida del sistema'
        ],
        correcta: 1,
        explica: 'El cable SATA lleva los DATOS entre el disco y la placa base. La energía llega por un cable SATA distinto que viene de la fuente. Su conector en "L" evita conectarlo al revés.'
    }
}

// Banco para pre-test / post-test. Se usan las MISMAS preguntas antes y después
// del laboratorio para medir cuánto aprendió el estudiante (ganancia de aprendizaje).
export const EVALUACION = [
    {
        pregunta: '¿Cuál de estos componentes es "el cerebro" que ejecuta las instrucciones de los programas?',
        opciones: ['La RAM', 'El CPU (procesador)', 'La fuente de poder', 'El gabinete'],
        correcta: 1
    },
    {
        pregunta: 'El modo Dual Channel de la memoria se consigue…',
        opciones: [
            'Usando un solo módulo grande',
            'Instalando los módulos en pareja, en ranuras del mismo color',
            'Overclockeando el CPU',
            'Conectando la RAM a la fuente'
        ],
        correcta: 1
    },
    {
        pregunta: 'Una PC se apaga sola a los pocos minutos y antes marcaba 96 °C en el CPU. La causa más probable es…',
        opciones: [
            'La tarjeta gráfica',
            'El disco de almacenamiento',
            'Un problema de refrigeración (disipador/pasta térmica)',
            'La memoria RAM'
        ],
        correcta: 2
    },
    {
        pregunta: 'La tarjeta gráfica (GPU) se instala en…',
        opciones: ['El socket del CPU', 'El slot PCIe ×16', 'Una ranura DDR4', 'El conector SATA'],
        correcta: 1
    },
    {
        pregunta: '¿Qué componente convierte la corriente del enchufe en energía utilizable por la PC?',
        opciones: ['La placa base', 'El CPU', 'La fuente de poder (PSU)', 'El SSD'],
        correcta: 2
    },
    {
        pregunta: 'Una PC no da video y la placa emite pitidos largos repetidos con el LED "DRAM" encendido. Falla en…',
        opciones: ['La memoria RAM', 'La fuente', 'El almacenamiento', 'El gabinete'],
        correcta: 0
    }
]

// --- Lógica de calificación (pura, testeable) ---

// Nota conceptual 0..10 según preguntas acertadas.
export function notaConceptual(aciertos = 0, total = 0) {
    if (total <= 0) return 0
    const r = (Math.max(0, aciertos) / total) * 10
    return Math.max(0, Math.min(10, r))
}

// Combina la nota de destreza (ensamblaje) con la de comprensión (preguntas).
// Por defecto 60% destreza + 40% comprensión: el ensamble sigue pesando más,
// pero ahora la nota refleja si el estudiante ENTENDIÓ, no solo si hizo clic bien.
export const PESO_CONCEPTUAL = 0.4

export function combinarNota(notaDestreza = 0, notaComprension = 0, pesoConceptual = PESO_CONCEPTUAL) {
    const p = Math.max(0, Math.min(1, pesoConceptual))
    const r = notaDestreza * (1 - p) + notaComprension * p
    return Math.max(0, Math.min(10, r))
}

// Ganancia de aprendizaje normalizada (Hake's gain): cuánto del margen que le
// faltaba recuperó el estudiante entre el pre y el post-test. Rango típico 0..1.
export function gananciaAprendizaje(preAciertos, postAciertos, total) {
    if (total <= 0) return 0
    const pre = Math.max(0, Math.min(total, preAciertos)) / total
    const post = Math.max(0, Math.min(total, postAciertos)) / total
    if (pre >= 1) return post >= 1 ? 1 : 0
    return Math.max(-1, Math.min(1, (post - pre) / (1 - pre)))
}
