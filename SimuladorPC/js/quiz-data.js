// quiz-data.js
// Evaluación formativa del laboratorio 3D y de la Academia.
//
// - PREGUNTAS_COMPONENTE: un BANCO de micro-preguntas por componente (varias cada
//   uno). Se elige UNA al azar cuando se necesita —tras instalar la pieza en el
//   laboratorio, o en el mini-quiz de la lección— para que el estudiante no
//   memorice una única respuesta por repetición. Cada pregunta explica el PORQUÉ.
// - EVALUACION: banco del pre-test / post-test. Por sesión se toma un subconjunto
//   AL AZAR que se usa IGUAL antes y después, para medir la ganancia de aprendizaje.
//
// Datos puros + funciones puras (la aleatoriedad usa un rng inyectable), así que
// todo se puede probar sin navegador.

export const PREGUNTAS_COMPONENTE = {
    case: [
        {
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
        {
            pregunta: '¿Sobre qué se atornilla la placa base dentro del gabinete?',
            opciones: [
                'Directamente sobre la chapa metálica',
                'Sobre unos separadores (standoffs) que la elevan',
                'Sobre la fuente de poder',
                'Sobre una capa de espuma aislante'
            ],
            correcta: 1,
            explica: 'La placa se monta sobre separadores metálicos (standoffs) que la elevan de la chapa del gabinete. Sin ellos, la placa haría contacto directo con el metal y se produciría un cortocircuito.'
        },
        {
            pregunta: '¿Por qué conviene un gabinete con buena ventilación?',
            opciones: [
                'Para que pese menos',
                'Para que las piezas se mantengan frías y duren más',
                'Para reducir el consumo de electricidad',
                'Para que la PC arranque más rápido'
            ],
            correcta: 1,
            explica: 'Un buen flujo de aire evacúa el calor que generan CPU y GPU. Piezas más frías rinden mejor y duran más; el peso, el consumo y la velocidad de arranque no dependen del gabinete.'
        }
    ],
    mb: [
        {
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
        {
            pregunta: '¿Qué determina qué procesadores son compatibles con una placa base?',
            opciones: [
                'El color de la placa',
                'El número de puertos USB',
                'El tipo de socket y el chipset',
                'La cantidad de ranuras de RAM'
            ],
            correcta: 2,
            explica: 'El socket (la forma física del zócalo) y el chipset definen qué CPU encajan y funcionan. Por eso, al elegir placa y procesador, ambos deben compartir el mismo socket.'
        },
        {
            pregunta: 'Con la PC apagada pero enchufada, un pequeño LED de la placa está encendido. ¿Qué indica?',
            opciones: [
                'Que la placa está dañada',
                'Que la placa recibe energía de la fuente (standby)',
                'Que el sistema operativo está cargando',
                'Que la RAM está en uso'
            ],
            correcta: 1,
            explica: 'Es el LED de standby: confirma que la fuente entrega energía a la placa aunque la PC esté apagada. Si está apagado y la PC no enciende, la primera sospechosa es la fuente.'
        }
    ],
    cpu: [
        {
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
        {
            pregunta: '¿Cuál es la función principal del procesador (CPU)?',
            opciones: [
                'Almacenar los archivos del usuario',
                'Ejecutar las instrucciones de los programas y hacer los cálculos',
                'Convertir la corriente eléctrica',
                'Enfriar el resto de los componentes'
            ],
            correcta: 1,
            explica: 'El CPU es el "cerebro": ejecuta las instrucciones y realiza los cálculos que hacen funcionar los programas. Guardar es tarea del disco; alimentar, de la fuente.'
        },
        {
            pregunta: '¿Por qué se aplica pasta térmica entre el CPU y el disipador?',
            opciones: [
                'Para pegar el disipador de forma permanente',
                'Para que el CPU no se mueva',
                'Para mejorar la transferencia de calor del CPU al disipador',
                'Para aislar eléctricamente el procesador'
            ],
            correcta: 2,
            explica: 'La pasta térmica rellena las micro-imperfecciones entre el CPU y el disipador, mejorando la transferencia de calor. Sin ella (o con ella seca), el CPU se sobrecalienta.'
        }
    ],
    cooler: [
        {
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
        {
            pregunta: '¿Cuánta pasta térmica conviene aplicar sobre el procesador?',
            opciones: [
                'Cubrir todo el CPU con una capa gruesa',
                'Un punto del tamaño de un guisante en el centro',
                'Llenar por completo el socket',
                'No hace falta ninguna'
            ],
            correcta: 1,
            explica: 'Basta un punto del tamaño de un guisante en el centro: la presión del disipador la reparte. Demasiada pasta puede desbordarse; muy poca deja huecos de aire que aíslan el calor.'
        },
        {
            pregunta: '¿A qué conector de la placa se enchufa el ventilador del disipador?',
            opciones: [
                'A un conector SATA',
                'Al conector CPU_FAN',
                'A un puerto USB interno',
                'Al conector de 24 pines'
            ],
            correcta: 1,
            explica: 'El ventilador del disipador va al conector CPU_FAN: así la placa controla su velocidad según la temperatura del procesador y detecta si se detiene.'
        }
    ],
    ram: [
        {
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
        {
            pregunta: '¿Cómo sabes en qué sentido va un módulo de RAM en su ranura?',
            opciones: [
                'Va igual en cualquier sentido',
                'Por una muesca (llave) que solo coincide en una orientación',
                'Por el color del módulo',
                'Se decide con un interruptor de la placa'
            ],
            correcta: 1,
            explica: 'El módulo tiene una muesca descentrada que coincide con la llave de la ranura en un solo sentido. Nunca hay que forzarlo: si no entra, probablemente está al revés.'
        },
        {
            pregunta: '¿Qué pasa si instalas un único módulo en lugar de dos en pareja?',
            opciones: [
                'La PC no arranca',
                'Funciona, pero en Single Channel (menos ancho de banda)',
                'Se daña la placa base',
                'La RAM trabaja al doble de velocidad'
            ],
            correcta: 1,
            explica: 'Con un solo módulo la PC funciona sin problemas, pero en Single Channel: hay menos ancho de banda que en Dual Channel, así que el rendimiento en tareas exigentes baja un poco.'
        }
    ],
    storage: [
        {
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
        {
            pregunta: '¿En qué ranura de la placa base se instala un SSD NVMe?',
            opciones: [
                'En una ranura de RAM',
                'En el slot M.2',
                'En el socket del CPU',
                'En el slot PCIe ×16 de la gráfica'
            ],
            correcta: 1,
            explica: 'El SSD NVMe se atornilla en el slot M.2 de la placa, que le da una conexión directa y muy veloz. Las ranuras DDR son para RAM y el PCIe ×16 para la GPU.'
        },
        {
            pregunta: '¿Por qué conviene instalar el sistema operativo en el SSD y no en el HDD?',
            opciones: [
                'Porque el HDD no puede tener sistema operativo',
                'Porque el SSD es mucho más rápido y el arranque es casi instantáneo',
                'Porque el SSD tiene más capacidad',
                'Porque el HDD consume más energía'
            ],
            correcta: 1,
            explica: 'El sistema operativo se lee constantemente; en el SSD, mucho más veloz, la PC arranca y abre programas en segundos. El HDD conviene para almacenamiento masivo por su bajo costo por gigabyte.'
        }
    ],
    gpu: [
        {
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
        {
            pregunta: '¿Cuál es la función principal de la tarjeta gráfica (GPU)?',
            opciones: [
                'Guardar los archivos del usuario',
                'Procesar y dibujar las imágenes que ves en pantalla',
                'Convertir la corriente eléctrica',
                'Coordinar la memoria RAM'
            ],
            correcta: 1,
            explica: 'La GPU se especializa en generar y renderizar gráficos: juegos, video y todo lo que aparece en pantalla. Cuanto más exigente es la imagen, más trabaja la tarjeta.'
        },
        {
            pregunta: 'Muchas tarjetas gráficas potentes necesitan, además del slot PCIe…',
            opciones: [
                'Un cable de datos SATA',
                'Cables de poder adicionales de la fuente',
                'Un segundo procesador',
                'Su propia ranura de RAM'
            ],
            correcta: 1,
            explica: 'El slot PCIe no entrega suficiente energía para las GPU potentes, así que llevan conectores de poder (6/8 pines) directos desde la fuente. Olvidar ese cable hace que la PC no dé video.'
        }
    ],
    power: [
        {
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
        {
            pregunta: '¿Qué conector de la fuente alimenta a la placa base principal?',
            opciones: [
                'El conector SATA',
                'El conector ATX de 24 pines',
                'El conector PCIe de 8 pines',
                'El conector Molex'
            ],
            correcta: 1,
            explica: 'La placa base se alimenta con el conector ATX de 24 pines. El de 8 pines (EPS) alimenta al CPU, los PCIe a la GPU y los SATA a los discos.'
        },
        {
            pregunta: '¿Por qué importa elegir una fuente con suficientes vatios?',
            opciones: [
                'Para que la PC pese más',
                'Para cubrir el consumo de todos los componentes con margen',
                'Para que arranque el sistema operativo',
                'Para reducir el uso de la RAM'
            ],
            correcta: 1,
            explica: 'La fuente debe entregar más vatios de los que consumen todos los componentes juntos (sobre todo CPU y GPU), con algo de margen. Una fuente insuficiente provoca apagones o inestabilidad bajo carga.'
        }
    ],
    fans: [
        {
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
        {
            pregunta: '¿Cuál es una configuración típica y eficiente de flujo de aire?',
            opciones: [
                'Todos los ventiladores expulsando aire',
                'Entrada de aire por el frente y salida por atrás/arriba',
                'Todos los ventiladores apagados',
                'Entrada y salida por el mismo lado'
            ],
            correcta: 1,
            explica: 'Lo habitual es meter aire frío por el frente y sacar el caliente por atrás y arriba (el calor sube). Así se crea una corriente que atraviesa las piezas y las mantiene frías.'
        },
        {
            pregunta: '¿A qué se conectan normalmente los ventiladores del gabinete?',
            opciones: [
                'A la fuente por un cable SATA de datos',
                'A los conectores SYS_FAN / CHA_FAN de la placa base',
                'Al socket del CPU',
                'Al slot M.2'
            ],
            correcta: 1,
            explica: 'Los ventiladores del gabinete van a los conectores SYS_FAN/CHA_FAN de la placa, que regulan su velocidad según la temperatura. El CPU_FAN se reserva para el ventilador del disipador.'
        }
    ],
    hdd: [
        {
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
        {
            pregunta: '¿Por qué un HDD es más sensible a los golpes que un SSD?',
            opciones: [
                'Porque pesa menos',
                'Porque guarda los datos en platos giratorios con un cabezal móvil',
                'Porque no tiene carcasa',
                'Porque usa más electricidad'
            ],
            correcta: 1,
            explica: 'El HDD graba los datos en platos que giran a gran velocidad, leídos por un cabezal muy cercano. Un golpe en marcha puede hacer que el cabezal toque el plato y dañe la información; el SSD, sin partes móviles, lo resiste mejor.'
        },
        {
            pregunta: '¿Para qué tipo de uso es más adecuado un HDD hoy en día?',
            opciones: [
                'Para instalar el sistema operativo',
                'Para almacenamiento masivo y respaldos',
                'Para juegos que exigen máxima velocidad',
                'Para reemplazar la memoria RAM'
            ],
            correcta: 1,
            explica: 'Por su bajo costo por gigabyte, el HDD brilla guardando muchos archivos: fotos, videos y respaldos. Las tareas que piden velocidad (SO, programas, juegos) rinden mejor en un SSD.'
        }
    ],
    sata: [
        {
            pregunta: '¿Qué transporta el cable de datos SATA?',
            opciones: [
                'La energía de la fuente hacia el disco',
                'Los datos entre el disco y la placa base',
                'La señal de video hacia el monitor',
                'La refrigeración líquida del sistema'
            ],
            correcta: 1,
            explica: 'El cable SATA lleva los DATOS entre el disco y la placa base. La energía llega por un cable SATA distinto que viene de la fuente. Su conector en "L" evita conectarlo al revés.'
        },
        {
            pregunta: '¿Qué evita que conectes el cable SATA al revés?',
            opciones: [
                'Una etiqueta de color',
                'Su conector con forma de "L"',
                'Un tornillo de seguridad',
                'Un imán interno'
            ],
            correcta: 1,
            explica: 'El conector SATA tiene forma de "L", así que solo entra en un sentido. Ese diseño "a prueba de errores" evita dañar el puerto por forzarlo al revés.'
        },
        {
            pregunta: 'El cable de datos SATA, ¿también lleva la energía al disco?',
            opciones: [
                'Sí, lleva datos y energía por el mismo cable',
                'No, la energía llega por un cable SATA de alimentación aparte',
                'Sí, pero solo en los HDD',
                'No, el disco no necesita energía'
            ],
            correcta: 1,
            explica: 'Son dos cables distintos: el de DATOS (más delgado, a la placa) y el de ALIMENTACIÓN SATA (más ancho, desde la fuente). El disco necesita ambos para funcionar.'
        }
    ]
}

// Banco para pre-test / post-test. Por sesión se elige un subconjunto al azar
// (ver elegirEvaluacion) que se usa IGUAL antes y después del laboratorio, para
// medir cuánto aprendió el estudiante (ganancia de aprendizaje). Son preguntas de
// MEDICIÓN: sin retroalimentación (no llevan "explica").
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
    },
    {
        pregunta: '¿Dónde conviene instalar el sistema operativo para que la PC arranque rápido?',
        opciones: ['En el HDD', 'En el SSD', 'En la RAM', 'En la tarjeta gráfica'],
        correcta: 1
    },
    {
        pregunta: '¿Qué componente protege a las piezas del polvo y los golpes y guía el flujo de aire?',
        opciones: ['La fuente de poder', 'El gabinete', 'La placa base', 'El disipador'],
        correcta: 1
    },
    {
        pregunta: 'Al colocar el procesador, ¿qué debe coincidir para no dañar sus contactos?',
        opciones: [
            'El color del CPU con el de la placa',
            'El triángulo dorado del CPU con la marca del socket',
            'El ventilador con la RAM',
            'El tamaño del CPU con el del disipador'
        ],
        correcta: 1
    },
    {
        pregunta: 'Si enciendes el CPU sin disipador ni pasta térmica, lo más probable es que…',
        opciones: [
            'Funcione más rápido',
            'Se sobrecaliente y el sistema se apague para protegerse',
            'La RAM deje de detectarse',
            'No pase nada'
        ],
        correcta: 1
    },
    {
        pregunta: 'El cable de datos SATA transporta…',
        opciones: [
            'La energía hacia el disco',
            'Los datos entre el disco y la placa base',
            'La señal de video',
            'La refrigeración del sistema'
        ],
        correcta: 1
    },
    {
        pregunta: 'Una PC totalmente muerta (sin luces ni ventiladores) tras descartar el enchufe apunta sobre todo a…',
        opciones: ['La memoria RAM', 'La tarjeta gráfica', 'La fuente de poder', 'El disco duro'],
        correcta: 2
    }
]

// --- Selección aleatoria del banco (pura y testeable con rng inyectable) ---

// Índice válido dentro de [0, len). Acota por si el rng inyectado devuelve 1.
function indiceAzar(len, rng) {
    if (len <= 0) return -1
    return Math.min(len - 1, Math.max(0, Math.floor(rng() * len)))
}

// Devuelve un elemento al azar del arreglo (o null si está vacío).
export function elegirAlAzar(arr, rng = Math.random) {
    if (!Array.isArray(arr) || arr.length === 0) return null
    return arr[indiceAzar(arr.length, rng)]
}

// Devuelve una MUESTRA de n elementos DISTINTOS, en orden aleatorio (Fisher-Yates
// parcial). Si n ≥ arr.length, devuelve todo el arreglo barajado.
export function muestraAlAzar(arr, n, rng = Math.random) {
    const copia = Array.isArray(arr) ? arr.slice() : []
    const total = Math.max(0, Math.min(n, copia.length))
    for (let i = 0; i < total; i++) {
        const j = i + Math.min(copia.length - 1 - i, Math.floor(rng() * (copia.length - i)))
        const tmp = copia[i]; copia[i] = copia[j]; copia[j] = tmp
    }
    return copia.slice(0, total)
}

// Escoge una pregunta al azar del banco de un componente (o null si no existe).
export function elegirPreguntaComponente(componenteId, rng = Math.random) {
    return elegirAlAzar(PREGUNTAS_COMPONENTE[componenteId], rng)
}

// Cuántas preguntas del banco EVALUACION se usan por sesión de laboratorio.
export const EVAL_POR_SESION = 6

// Escoge el subconjunto del pre/post-test para una sesión. Debe llamarse UNA vez
// por sesión y reusar el resultado en el pre-test y el post-test (mismas preguntas).
export function elegirEvaluacion(n = EVAL_POR_SESION, rng = Math.random) {
    return muestraAlAzar(EVALUACION, n, rng)
}

// --- Lógica de calificación (pura, testeable) ---

// Nota conceptual 0..10 según preguntas acertadas.
export function notaConceptual(aciertos = 0, total = 0) {
    if (total <= 0) return 0
    const r = (Math.max(0, aciertos) / total) * 10
    return Math.max(0, Math.min(10, r))
}

// Nota de destreza 0..10 del ensamblaje: parte de 10 y penaliza cada error de
// pieza (−1) y cada demora (−0.5). Es la dimensión "hacer" del laboratorio.
// Antes vivía embebida en juego.js (calcularNota); se extrajo aquí para poder
// probarla sin navegador.
export function notaDestreza(errores = 0, demoras = 0) {
    return Math.max(0, Math.min(10, 10 - errores * 1.0 - demoras * 0.5))
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
