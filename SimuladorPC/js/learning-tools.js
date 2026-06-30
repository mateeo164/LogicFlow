

export const CPU_WATTAGE = {
  'cpu-intel-i3': { name: 'Intel Core i3-12100F', tdp: 89, socket: 'LGA1700' },
  'cpu-intel-i5': { name: 'Intel Core i5-12600K', tdp: 125, socket: 'LGA1700' },
  'cpu-intel-i7': { name: 'Intel Core i7-13700K', tdp: 253, socket: 'LGA1700' },
  'cpu-intel-i9': { name: 'Intel Core i9-13900K', tdp: 253, socket: 'LGA1700' },
  'cpu-amd-ryzen5': { name: 'AMD Ryzen 5 7600X', tdp: 105, socket: 'AM5' },
  'cpu-amd-ryzen7': { name: 'AMD Ryzen 7 7700X', tdp: 105, socket: 'AM5' },
  'cpu-amd-ryzen9': { name: 'AMD Ryzen 9 7950X', tdp: 170, socket: 'AM5' }
}

export const GPU_WATTAGE = {
  'gpu-gtx1650': { name: 'NVIDIA GTX 1650', tdp: 75, vram: '4 GB GDDR5' },
  'gpu-rtx3060': { name: 'NVIDIA RTX 3060', tdp: 170, vram: '12 GB GDDR6' },
  'gpu-rtx4060': { name: 'NVIDIA RTX 4060', tdp: 115, vram: '8 GB GDDR6' },
  'gpu-rtx4070': { name: 'NVIDIA RTX 4070', tdp: 200, vram: '12 GB GDDR6X' },
  'gpu-rtx4080': { name: 'NVIDIA RTX 4080', tdp: 320, vram: '16 GB GDDR6X' },
  'gpu-rtx4090': { name: 'NVIDIA RTX 4090', tdp: 450, vram: '24 GB GDDR6X' },
  'gpu-rx6600': { name: 'AMD RX 6600', tdp: 132, vram: '8 GB GDDR6' },
  'gpu-rx6700xt': { name: 'AMD RX 6700 XT', tdp: 230, vram: '12 GB GDDR6' },
  'gpu-rx7800xt': { name: 'AMD RX 7800 XT', tdp: 263, vram: '16 GB GDDR6' }
}

export const BASE_WATTAGE = {
  motherboard: 50,
  ramStick: 5,
  ssd: 7,
  hdd: 15,
  fan: 5,
  rgb: 10
}

export function calculateWattage({ cpuId, gpuId, ramSticks = 2, ssds = 1, hdds = 0, fans = 3, rgb = true }) {
  const cpu = CPU_WATTAGE[cpuId] || { tdp: 65 }
  const gpu = GPU_WATTAGE[gpuId] || { tdp: 0 }

  let total = cpu.tdp + gpu.tdp + BASE_WATTAGE.motherboard
  total += ramSticks * BASE_WATTAGE.ramStick
  total += ssds * BASE_WATTAGE.ssd
  total += hdds * BASE_WATTAGE.hdd
  total += fans * BASE_WATTAGE.fan
  total += rgb ? BASE_WATTAGE.rgb : 0

  const recommended = Math.ceil(total * 1.2 / 50) * 50

  return {
    total: Math.round(total),
    recommended,
    headroom: recommended - total,
    efficiency: {
      bronze: Math.round(recommended * 0.82),
      silver: Math.round(recommended * 0.87),
      gold: Math.round(recommended * 0.90),
      platinum: Math.round(recommended * 0.92)
    }
  }
}

export function getEfficiencyRating(recommendedWattage) {
  if (recommendedWattage <= 450) return { label: 'Bronze 80 Plus', color: '#cd7f32' }
  if (recommendedWattage <= 650) return { label: 'Gold 80 Plus', color: '#f59e0b' }
  return { label: 'Platinum 80 Plus', color: '#94a3b8' }
}

export const GLOSARIO = [
  {
    term: 'CPU',
    title: 'Unidad Central de Procesamiento',
    description: 'El cerebro de la computadora. Ejecuta instrucciones y coordina el resto de componentes. Se mide por núcleos, hilos y frecuencia.',
    tags: ['Procesador', 'Hardware']
  },
  {
    term: 'GPU',
    title: 'Unidad de Procesamiento Gráfico',
    description: 'Procesa gráficos y carga de trabajo paralelo. Esencial para videojuegos, diseño 3D e inteligencia artificial.',
    tags: ['Gráficos', 'Hardware']
  },
  {
    term: 'RAM',
    title: 'Memoria de Acceso Aleatorio',
    description: 'Almacenamiento volátil de alta velocidad donde la CPU guarda datos de programas en ejecución.',
    tags: ['Memoria', 'Hardware']
  },
  {
    term: 'Motherboard',
    title: 'Placa base',
    description: 'Placa principal que conecta e interconecta todos los componentes de la PC.',
    tags: ['Placa', 'Hardware']
  },
  {
    term: 'PSU',
    title: 'Fuente de Poder',
    description: 'Convierte corriente alterna en continua y alimenta todos los componentes. Su capacidad se mide en vatios (W).',
    tags: ['Energía', 'Hardware']
  },
  {
    term: 'SSD',
    title: 'Unidad de Estado Sólido',
    description: 'Almacenamiento persistente sin partes móviles. Ofrece velocidades mucho mayores que un disco duro tradicional.',
    tags: ['Almacenamiento', 'Hardware']
  },
  {
    term: 'HDD',
    title: 'Disco Duro',
    description: 'Almacenamiento mecánico con platos magnéticos. Más lento que SSD pero típicamente más económico por GB.',
    tags: ['Almacenamiento', 'Hardware']
  },
  {
    term: 'Cooler',
    title: 'Sistema de refrigeración',
    description: 'Disipa el calor generado por la CPU u otros componentes para mantener temperaturas seguras.',
    tags: ['Refrigeración', 'Hardware']
  },
  {
    term: 'Case',
    title: 'Gabinete',
    description: 'Carcasa que alberga y protege los componentes. Su diseño afecta el flujo de aire y la estética.',
    tags: ['Gabinete', 'Hardware']
  },
  {
    term: 'VRAM',
    title: 'Memoria de video',
    description: 'Memoria dedicada en la tarjeta gráfica para almacenar texturas, buffers y datos de renderizado.',
    tags: ['Gráficos', 'Memoria']
  },
  {
    term: 'TDP',
    title: 'Diseño de Potencia Térmica',
    description: 'Medida del calor máximo que un componente genera bajo carga, expresada en vatios.',
    tags: ['Energía', 'Refrigeración']
  },
  {
    term: 'PCIe',
    title: 'Interconexión de Componentes Periféricos Express',
    description: 'Bus de alta velocidad para conectar tarjetas gráficas, SSDs NVMe y otros dispositivos.',
    tags: ['Conectividad', 'Hardware']
  },
  {
    term: 'Socket',
    title: 'Zócalo de CPU',
    description: 'Conector físico en la motherboard donde se instala el procesador. Debe coincidir con el socket del CPU.',
    tags: ['CPU', 'Placa']
  },
  {
    term: 'Overclocking',
    title: 'Sobrerreloj',
    description: 'Aumentar la frecuencia de reloj de un componente para obtener mayor rendimiento, generando más calor.',
    tags: ['Rendimiento', 'CPU']
  },
  {
    term: 'Airflow',
    title: 'Flujo de aire',
    description: 'Movimiento del aire dentro del gabinete. Un buen airflow reduce temperaturas y mejora la estabilidad.',
    tags: ['Refrigeración', 'Gabinete']
  }
]

export function filterGlosario(query = '') {
  const q = query.toLowerCase().trim()
  if (!q) return GLOSARIO
  return GLOSARIO.filter(item =>
    item.term.toLowerCase().includes(q) ||
    item.title.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.tags.some(t => t.toLowerCase().includes(q))
  )
}
