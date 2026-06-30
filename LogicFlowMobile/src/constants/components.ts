export interface PCComponent {
  id: string
  label: string
  icon: string
  xpValue: number
  shortDesc: string
  fullDesc: string
  funFact: string
  analogy: string
  specs: { label: string; value: string }[]
  assemblyStep: number
  assemblyHint: string
  quizQuestion: string
  quizOptions: string[]
  quizAnswerIndex: number
}

export const PC_COMPONENTS: PCComponent[] = [
  {
    id: 'case',
    label: 'Gabinete (Case)',
    icon: '🗄',
    xpValue: 100,
    shortDesc: 'La estructura que protege todos los componentes.',
    fullDesc: 'El gabinete es el chasis que aloja y protege todos los componentes del PC. Define el factor de forma (ATX, Micro-ATX) y determina cuántos componentes pueden instalarse.',
    funFact: 'Los primeros gabinetes de PC en los años 80 eran de madera o plástico grueso. Los materiales modernos incluyen aluminio, acero y paneles de vidrio templado.',
    analogy: 'El gabinete es como el esqueleto del cuerpo humano: da estructura y protege los órganos internos.',
    specs: [
      { label: 'Factor de forma', value: 'Mid-Tower ATX' },
      { label: 'Material', value: 'Acero + vidrio templado' },
      { label: 'Bahías', value: '2× 3.5" + 2× 2.5"' },
    ],
    assemblyStep: 1,
    assemblyHint: 'Coloca el gabinete sobre una superficie plana y retira el panel lateral. Instala los separadores (standoffs) en la placa base antes de continuar.',
    quizQuestion: '¿Qué determina el "factor de forma" de un gabinete?',
    quizOptions: ['El color del gabinete', 'El tamaño y disposición de la placa base compatible', 'La cantidad de ventiladores incluidos', 'El material de fabricación'],
    quizAnswerIndex: 1,
  },
  {
    id: 'mb',
    label: 'Placa base (Motherboard)',
    icon: '🖥',
    xpValue: 100,
    shortDesc: 'El cerebro que conecta todos los componentes.',
    fullDesc: 'La placa base (motherboard) es el circuito impreso principal que interconecta todos los componentes del sistema: CPU, RAM, GPU, almacenamiento y periféricos. Define la compatibilidad de componentes.',
    funFact: 'Una placa base moderna tiene más transistores que la CPU completa de los años 90. Sus trazas de cobre son más delgadas que un cabello humano.',
    analogy: 'La placa base es como el sistema circulatorio y nervioso del cuerpo: transporta datos (sangre) y señales (impulsos nerviosos) a todos los órganos (componentes).',
    specs: [
      { label: 'Socket', value: 'AM5' },
      { label: 'Chipset', value: 'X570' },
      { label: 'Slots RAM', value: '4× DDR4' },
      { label: 'PCIe', value: '3× PCIe 4.0' },
    ],
    assemblyStep: 2,
    assemblyHint: 'Instala primero el I/O shield en el gabinete. Luego alinea la placa base con los separadores y fíjala con tornillos sin apretar demasiado.',
    quizQuestion: '¿Qué es el "socket" en una placa base?',
    quizOptions: ['Un puerto USB especial', 'El conector físico donde se instala el procesador', 'Un tipo de memoria RAM', 'El conector de la fuente de poder'],
    quizAnswerIndex: 1,
  },
  {
    id: 'cpu',
    label: 'Procesador (CPU)',
    icon: '⚡',
    xpValue: 100,
    shortDesc: 'El cerebro que ejecuta todas las instrucciones.',
    fullDesc: 'La CPU (Unidad Central de Procesamiento) ejecuta instrucciones y procesa datos. Sus características clave son: núcleos, hilos, frecuencia (GHz) y arquitectura. Es el componente más crítico del sistema.',
    funFact: 'Un procesador moderno puede ejecutar más de 3,000 millones de instrucciones por segundo. Si un humano realizara una operación por segundo, tardaría 95 años en hacer lo que una CPU hace en 1 segundo.',
    analogy: 'La CPU es como el cerebro del cuerpo: toma decisiones, procesa información y coordina todas las demás partes del sistema.',
    specs: [
      { label: 'Modelo', value: 'AMD Ryzen 5 5600X' },
      { label: 'Núcleos', value: '6 núcleos / 12 hilos' },
      { label: 'Frecuencia', value: '3.7 GHz (Boost 4.6 GHz)' },
      { label: 'TDP', value: '65W' },
    ],
    assemblyStep: 3,
    assemblyHint: 'Levanta la palanca del socket ZIF. Alinea el triángulo dorado de la CPU con la esquina del socket. NO ejerzas presión — cae por gravedad.',
    quizQuestion: '¿Qué mide la frecuencia de un procesador en GHz?',
    quizOptions: ['La temperatura máxima', 'La cantidad de núcleos', 'Los ciclos de procesamiento por segundo', 'El consumo de energía'],
    quizAnswerIndex: 2,
  },
  {
    id: 'cooler',
    label: 'Disipador (Cooler)',
    icon: '❄',
    xpValue: 100,
    shortDesc: 'Mantiene la CPU a temperatura segura.',
    fullDesc: 'El cooler disipa el calor generado por la CPU. Puede ser de aire (heatsink + ventilador) o líquido (AIO o loop personalizado). Sin enfriamiento adecuado, la CPU reduce su rendimiento o se daña.',
    funFact: 'Un procesador sin disipador puede alcanzar 100°C en menos de 1 segundo. La pasta térmica entre el procesador y el disipador mejora la transferencia de calor hasta un 40%.',
    analogy: 'El cooler es como el sistema de sudoración del cuerpo: regula la temperatura para que los demás sistemas funcionen correctamente.',
    specs: [
      { label: 'Tipo', value: 'Air Cooler AMD Wraith Stealth' },
      { label: 'TDP soportado', value: 'Hasta 65W' },
      { label: 'Ruido', value: '< 28 dBA' },
    ],
    assemblyStep: 4,
    assemblyHint: 'Aplica una pequeña gota de pasta térmica del tamaño de un guisante en el centro del procesador. Fija el disipador con presión uniforme.',
    quizQuestion: '¿Por qué se aplica pasta térmica entre la CPU y el cooler?',
    quizOptions: ['Para fijar el cooler permanentemente', 'Para llenar los microscopios vacíos y mejorar la transferencia de calor', 'Para reducir el ruido del ventilador', 'Para aumentar la frecuencia del procesador'],
    quizAnswerIndex: 1,
  },
  {
    id: 'ram',
    label: 'Memoria RAM',
    icon: '📊',
    xpValue: 100,
    shortDesc: 'Memoria de trabajo rápida y temporal.',
    fullDesc: 'La RAM (Memoria de Acceso Aleatorio) almacena datos temporales que la CPU necesita acceder rápidamente. Es volátil: pierde sus datos al apagar el equipo. Más RAM permite ejecutar más programas simultáneamente.',
    funFact: 'La velocidad de la RAM moderna (DDR5 a 6400 MHz) es tan rápida que puede transferir 51.2 GB/s — lo mismo que copiar 10 películas HD cada segundo.',
    analogy: 'La RAM es como el escritorio de trabajo: cuanto más grande, más cosas puedes tener a la mano simultáneamente sin tener que ir al archivero (disco duro).',
    specs: [
      { label: 'Tipo', value: 'DDR4 G.Skill Trident Z Neo' },
      { label: 'Capacidad', value: '16 GB (2× 8 GB)' },
      { label: 'Frecuencia', value: '3600 MHz' },
      { label: 'Latencia', value: 'CL16' },
    ],
    assemblyStep: 5,
    assemblyHint: 'Instala los módulos en los slots A2 y B2 (slots 2 y 4) para habilitar Dual Channel. Empuja firmemente hasta que los seguros hagan clic.',
    quizQuestion: '¿Qué ocurre con los datos en la RAM cuando apagas el computador?',
    quizOptions: ['Se guardan automáticamente en el disco', 'Se transfieren al procesador', 'Se pierden permanentemente', 'Se comprimen y guardan en la nube'],
    quizAnswerIndex: 2,
  },
  {
    id: 'storage',
    label: 'Almacenamiento NVMe',
    icon: '💾',
    xpValue: 100,
    shortDesc: 'Almacenamiento rápido y permanente.',
    fullDesc: 'Los SSD NVMe M.2 son dispositivos de almacenamiento permanente que usan el protocolo NVMe a través del bus PCIe, siendo 5-7× más rápidos que los SSD SATA tradicionales.',
    funFact: 'Un SSD NVMe moderno puede leer datos a 7,000 MB/s. Si leyeras un libro de 200 páginas por segundo, el SSD leería más de 3,500 libros por segundo.',
    analogy: 'El almacenamiento es como el archivero de una oficina: guarda todo de forma permanente aunque se vaya la luz, pero acceder a él es más lento que el escritorio (RAM).',
    specs: [
      { label: 'Modelo', value: 'Samsung 990 Pro 1TB' },
      { label: 'Interfaz', value: 'NVMe PCIe 4.0 x4' },
      { label: 'Lectura', value: '7,450 MB/s' },
      { label: 'Escritura', value: '6,900 MB/s' },
    ],
    assemblyStep: 6,
    assemblyHint: 'Inserta el módulo M.2 en el slot a 30° de ángulo, empuja hacia abajo y fija con el tornillo de retención.',
    quizQuestion: '¿Cuál es la principal ventaja del protocolo NVMe sobre SATA en los SSD?',
    quizOptions: ['Mayor capacidad de almacenamiento', 'Menor precio por GB', 'Velocidades de transferencia significativamente más altas', 'Mejor compatibilidad con sistemas antiguos'],
    quizAnswerIndex: 2,
  },
  {
    id: 'gpu',
    label: 'Tarjeta gráfica (GPU)',
    icon: '🎮',
    xpValue: 100,
    shortDesc: 'Procesa gráficos e imágenes para la pantalla.',
    fullDesc: 'La GPU (Unidad de Procesamiento Gráfico) tiene miles de núcleos pequeños optimizados para procesar gráficos en paralelo. Hoy también se usa para IA, ML y minería de criptomonedas.',
    funFact: 'La RTX 3090 tiene 10,496 núcleos CUDA trabajando en paralelo. Si cada núcleo fuera un trabajador, sería como tener una ciudad entera trabajando simultáneamente.',
    analogy: 'La GPU es como el departamento de arte de una empresa: se encarga de toda la parte visual, liberando al CEO (CPU) para tareas más importantes.',
    specs: [
      { label: 'Modelo', value: 'NVIDIA RTX 3090' },
      { label: 'VRAM', value: '24 GB GDDR6X' },
      { label: 'Núcleos CUDA', value: '10,496' },
      { label: 'TDP', value: '350W' },
    ],
    assemblyStep: 7,
    assemblyHint: 'Retira la cubierta del slot PCIe x16. Inserta la GPU con firmeza hasta que el seguro haga clic. Conecta los cables de poder PCIe 8-pin.',
    quizQuestion: '¿Por qué las GPUs son eficientes para inteligencia artificial?',
    quizOptions: ['Tienen más memoria que la CPU', 'Sus miles de núcleos permiten procesamiento masivo en paralelo', 'Consumen menos energía', 'Son más baratas de fabricar'],
    quizAnswerIndex: 1,
  },
  {
    id: 'power',
    label: 'Fuente de poder (PSU)',
    icon: '🔌',
    xpValue: 100,
    shortDesc: 'Convierte y distribuye la energía eléctrica.',
    fullDesc: 'La PSU (Power Supply Unit) convierte la corriente alterna (AC) del tomacorriente en corriente continua (DC) que los componentes necesitan (+12V, +5V, +3.3V). Su eficiencia se mide con certificaciones 80 Plus.',
    funFact: 'Las certificaciones 80 Plus van de Bronze a Titanium. Una PSU Gold desperdicia menos del 12% de energía. Una PC encendida 24/7 con PSU Bronze vs Titanium puede generar una diferencia de $50/año en electricidad.',
    analogy: 'La PSU es como el corazón del cuerpo: bombea "energía" (sangre) a todos los órganos (componentes) en la cantidad exacta que necesitan.',
    specs: [
      { label: 'Potencia', value: '850W' },
      { label: 'Certificación', value: '80+ Gold' },
      { label: 'Modular', value: 'Semi-modular' },
    ],
    assemblyStep: 8,
    assemblyHint: 'Instala la PSU con el ventilador hacia abajo (si el gabinete tiene rejilla inferior). Conecta: ATX 24-pin a placa base, EPS 8-pin a CPU, PCIe 8-pin a GPU.',
    quizQuestion: '¿Qué indica la certificación "80 Plus Gold" en una fuente de poder?',
    quizOptions: ['Que la fuente pesa menos de 1kg', 'Que opera con al menos 87-92% de eficiencia energética', 'Que es fabricada con materiales de oro', 'Que tiene 80 conectores disponibles'],
    quizAnswerIndex: 1,
  },
]

export const COMPONENT_MAP = Object.fromEntries(PC_COMPONENTS.map(c => [c.id, c]))

export const LEVELS = [
  { name: 'Novato', minXp: 0, color: '#8a8378', icon: '🌱' },
  { name: 'Aprendiz', minXp: 100, color: '#486581', icon: '📘' },
  { name: 'Técnico', minXp: 300, color: '#047857', icon: '🔧' },
  { name: 'Experto', minXp: 600, color: '#b45309', icon: '🧠' },
  { name: 'Master Builder', minXp: 1000, color: '#92400e', icon: '👑' },
]

export function getLevel(xp: number) {
  let current = LEVELS[0]
  for (const level of LEVELS) {
    if (xp >= level.minXp) current = level
    else break
  }
  return current
}

export function getLevelProgress(xp: number) {
  const current = getLevel(xp)
  const currentIndex = LEVELS.findIndex(l => l.minXp === current.minXp)
  const next = LEVELS[currentIndex + 1]
  if (!next) return { current, next: null, progress: 100, needed: 0 }
  const progress = Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)
  return { current, next, progress: Math.min(100, progress), needed: next.minXp - xp }
}

export function calculateXp(simulacionesCompletadas: number, componentesInstalados: string[]) {
  return componentesInstalados.length * 100 + simulacionesCompletadas * 200
}
