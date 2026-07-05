// academia-data.js
// Contenido educativo de la Academia LogicFlow: la capa de TEORÍA que acompaña
// al laboratorio 3D. Datos puros (sin dependencias) para poder renderizarlos en
// cualquier página y probarlos sin navegador.
//
// Estructura:
//   MODULOS   → agrupan lecciones en un recorrido con sentido pedagógico.
//   LECCIONES → cada lección tiene bloques de contenido tipados que leccion.js
//               convierte en HTML. Las claves de `quiz` apuntan a
//               PREGUNTAS_COMPONENTE (quiz-data.js) para reutilizar el banco del lab.

export const MODULOS = [
  {
    id: 'fundamentos',
    nombre: 'Fundamentos',
    resumen: 'Qué es una computadora, cómo trabaja por dentro y cómo cuidarla mientras la armas.',
    lecciones: ['que-es-una-pc', 'compatibilidad', 'seguridad-esd']
  },
  {
    id: 'componentes',
    nombre: 'Los 8 componentes',
    resumen: 'Pieza por pieza, en el mismo orden en que las montarás en el laboratorio 3D.',
    lecciones: ['case', 'mb', 'cpu', 'cooler', 'ram', 'storage', 'gpu', 'power']
  },
  {
    id: 'cierre',
    nombre: 'Del montaje al arranque',
    resumen: 'Por qué el orden importa y qué ocurre la primera vez que presionas el botón de encendido.',
    lecciones: ['orden-de-montaje', 'primer-arranque']
  }
]

export const LECCIONES = {
  // ---------------------------------------------------------------- FUNDAMENTOS
  'que-es-una-pc': {
    icono: '💡',
    titulo: '¿Qué es una computadora y cómo trabaja?',
    subtitulo: 'La idea de fondo antes de tocar una sola pieza.',
    lectura: '4 min',
    bloques: [
      { t: 'p', v: 'Una computadora personal (PC) no es una caja mágica: es un equipo de piezas que se reparten el trabajo. Cada componente tiene <strong>una función clara</strong> y todos se comunican a través de una placa central. Entender ese reparto de tareas es lo que convierte el ensamblaje en algo lógico en lugar de memorístico.' },
      { t: 'h', v: 'El ciclo de todo lo que hace una PC' },
      { t: 'p', v: 'Casi cualquier acción —abrir un juego, escribir un documento, reproducir un video— sigue el mismo ciclo: <strong>entrada → procesamiento → memoria → almacenamiento → salida</strong>. La computadora recibe datos, los procesa, los mantiene a mano mientras trabaja, los guarda de forma permanente y te muestra un resultado.' },
      { t: 'ul', v: [
        '<strong>Procesar:</strong> el CPU ejecuta las instrucciones. Es el cerebro.',
        '<strong>Recordar ahora:</strong> la RAM guarda lo que se está usando en este instante.',
        '<strong>Guardar para siempre:</strong> el SSD conserva el sistema y tus archivos aunque apagues el equipo.',
        '<strong>Mostrar:</strong> la GPU dibuja en pantalla lo que ves.',
        '<strong>Alimentar y conectar:</strong> la fuente da energía y la placa base une todo.'
      ] },
      { t: 'dato', v: 'La diferencia clave entre RAM y SSD: la RAM se borra al apagar (es la mesa de trabajo), el SSD no (es el archivador). Por eso guardar tus documentos importa.' },
      { t: 'h', v: 'Por qué esto te ayuda a ensamblar' },
      { t: 'p', v: 'Cuando sabes qué hace cada pieza, entiendes por qué va donde va. El CPU necesita estar cerca de la RAM porque intercambian datos constantemente; la GPU va en una ranura ancha y rápida porque mueve muchísima información; la fuente va abajo y aparte porque maneja electricidad. Nada está colocado al azar.' }
    ],
    terminos: ['CPU', 'RAM', 'SSD', 'GPU', 'PSU'],
    cta: 'lab'
  },

  'compatibilidad': {
    icono: '🧩',
    titulo: 'Compatibilidad: que las piezas se entiendan',
    subtitulo: 'El error nº1 de un armado real es comprar piezas que no encajan.',
    lectura: '4 min',
    bloques: [
      { t: 'p', v: 'Puedes tener los mejores componentes del mundo y aun así fallar si no son <strong>compatibles entre sí</strong>. Antes de comprar (o de ensamblar en el simulador), conviene revisar cuatro puntos de encaje.' },
      { t: 'h', v: 'Los 4 encajes que debes verificar' },
      { t: 'ul', v: [
        '<strong>Socket CPU ↔ Placa base:</strong> el procesador y la placa deben usar el mismo socket (por ejemplo AM4 con AM4, o LGA1700 con LGA1700). Es el encaje más importante.',
        '<strong>Tipo de RAM:</strong> una placa DDR4 solo acepta memoria DDR4, no DDR5. No entran físicamente por accidente.',
        '<strong>Tamaño de placa ↔ Gabinete:</strong> una placa ATX no cabe en un gabinete pensado solo para mini-ITX.',
        '<strong>Potencia de la fuente:</strong> la PSU debe entregar suficientes vatios para el CPU y, sobre todo, la GPU.'
      ] },
      { t: 'dato', v: 'El socket es un patrón físico de contactos. Si el CPU y la placa no coinciden, el procesador ni siquiera se asienta. Ningún adaptador arregla eso.' },
      { t: 'h', v: 'Una regla mental simple' },
      { t: 'p', v: 'Elige primero el <strong>CPU</strong>; él define el socket. Luego una <strong>placa</strong> con ese socket y el tipo de RAM que quieras. Después la <strong>RAM</strong> compatible, el <strong>almacenamiento</strong>, la <strong>GPU</strong> según tu uso y, al final, una <strong>fuente</strong> que cubra el consumo de todo con margen. Esa cadena evita el 90% de las incompatibilidades.' },
      { t: 'p', v: 'La <strong>Calculadora PSU</strong> de LogicFlow te ayuda con el último paso: estima el consumo de tu configuración y sugiere la potencia ideal.' }
    ],
    terminos: ['Socket', 'ATX', 'PCIe', 'TDP'],
    cta: 'calculadora'
  },

  'seguridad-esd': {
    icono: '🛡️',
    titulo: 'Seguridad y buenas prácticas',
    subtitulo: 'Cómo no dañar piezas que cuestan cientos de dólares.',
    lectura: '3 min',
    bloques: [
      { t: 'p', v: 'El componente electrónico más frágil no le teme a los golpes, sino a algo invisible: la <strong>electricidad estática</strong> (ESD). Una descarga que tú ni sientes puede dañar un chip para siempre. En el laboratorio 3D no hay riesgo, pero estas prácticas son las que usarías con hardware real.' },
      { t: 'aviso', v: 'Nunca manipules componentes con la PC enchufada. Desconecta la corriente y presiona el botón de encendido unos segundos para descargar la electricidad residual.' },
      { t: 'h', v: 'Reglas de oro' },
      { t: 'ul', v: [
        'Descarga tu estática tocando una superficie metálica sin pintar antes de tocar las piezas (o usa una pulsera antiestática).',
        'Sujeta las placas y tarjetas por los <strong>bordes</strong>; no toques los pines ni los circuitos dorados.',
        'Trabaja sobre una superficie dura y no sobre alfombra o mantas, que generan estática.',
        'No fuerces nada: si una pieza no entra, casi siempre está mal orientada. Revisa antes de empujar.',
        'Guarda los tornillos por grupos para no perderlos ni confundirlos.'
      ] },
      { t: 'dato', v: 'El triángulo dorado del CPU y las muescas de la RAM existen precisamente para que no puedas montarlos al revés… si prestas atención. La fuerza bruta es el enemigo.' }
    ],
    terminos: ['Socket', 'POST'],
    cta: 'lab'
  },

  // --------------------------------------------------------------- COMPONENTES
  case: {
    icono: '🗄️',
    titulo: 'Gabinete',
    subtitulo: 'La estructura que protege y organiza todo.',
    lectura: '3 min',
    marca: 'NZXT H510 · Mid Tower',
    bloques: [
      { t: 'p', v: 'El gabinete (o <em>case</em>) es el esqueleto de la PC: aloja y protege el resto de componentes. Pero no es solo una caja bonita: su diseño decide qué tan fría y silenciosa será tu computadora.' },
      { t: 'h', v: 'Para qué sirve realmente' },
      { t: 'ul', v: [
        'Protege las piezas del polvo, la humedad y los golpes.',
        'Guía el <strong>flujo de aire</strong>: entra aire fresco por delante y sale caliente por detrás/arriba.',
        'Organiza el cableado por la parte trasera para un montaje limpio.',
        'Define qué tamaño de placa base puedes usar (ATX, micro-ATX, mini-ITX).'
      ] },
      { t: 'dato', v: 'Un buen flujo de aire baja varios grados la temperatura de toda la PC sin gastar un centavo extra. La refrigeración empieza por el gabinete.' },
      { t: 'specs', v: { 'Formato': 'Mid Tower ATX', 'Material': 'Acero + vidrio templado', 'Bahías': '2.5" / 3.5"', 'Ventiladores': 'Hasta 7', 'Gestión de cables': 'Trasera' } }
    ],
    terminos: ['Case', 'Airflow', 'ATX'],
    quiz: 'case',
    cta: 'lab'
  },

  mb: {
    icono: '🔲',
    titulo: 'Placa base',
    subtitulo: 'El núcleo que conecta y comunica todo.',
    lectura: '4 min',
    marca: 'ASUS ROG Strix · ATX',
    bloques: [
      { t: 'p', v: 'La placa base (<em>motherboard</em>) es el punto de encuentro de la PC: CPU, RAM, almacenamiento, GPU y fuente se conectan a ella y se comunican a través de sus circuitos. Si el CPU es el cerebro, la placa es el sistema nervioso.' },
      { t: 'h', v: 'Sus zonas clave' },
      { t: 'ul', v: [
        '<strong>Socket:</strong> donde se asienta el CPU. Define qué procesadores admite.',
        '<strong>Ranuras DDR:</strong> para los módulos de RAM, normalmente 2 o 4.',
        '<strong>Slots PCIe:</strong> el ×16 (el más largo) es para la tarjeta gráfica.',
        '<strong>Ranuras M.2:</strong> para SSD NVMe ultrarrápidos, sin cables.',
        '<strong>Conectores de energía:</strong> reciben la corriente de la fuente y la reparten.'
      ] },
      { t: 'dato', v: 'El chipset de la placa determina funciones como el overclocking, el número de puertos y la velocidad del PCIe. Dos placas con el mismo socket pueden ofrecer cosas muy distintas según su chipset.' },
      { t: 'specs', v: { 'Socket': 'AM4', 'Formato': 'ATX', 'Chipset': 'AMD X570', 'Memoria': '4× DDR4 (máx. 128 GB)', 'PCIe': 'PCIe 4.0 ×16' } }
    ],
    terminos: ['Motherboard', 'Socket', 'PCIe', 'M.2', 'BIOS / UEFI'],
    quiz: 'mb',
    cta: 'lab'
  },

  cpu: {
    icono: '🧠',
    titulo: 'Procesador (CPU)',
    subtitulo: 'El cerebro que ejecuta cada instrucción.',
    lectura: '4 min',
    marca: 'AMD Ryzen 9 5900X',
    bloques: [
      { t: 'p', v: 'El procesador o CPU (<em>Central Processing Unit</em>) ejecuta las instrucciones de todos los programas. Millones de veces por segundo recibe una orden, la resuelve y entrega un resultado. Su velocidad y su cantidad de núcleos definen buena parte del rendimiento de la PC.' },
      { t: 'h', v: 'Cómo se mide un CPU' },
      { t: 'ul', v: [
        '<strong>Núcleos:</strong> unidades de cálculo independientes. Más núcleos = más tareas a la vez.',
        '<strong>Hilos:</strong> cada núcleo puede atender varios hilos, multiplicando el trabajo simultáneo.',
        '<strong>Frecuencia (GHz):</strong> cuántos ciclos por segundo ejecuta. Más GHz = más rápido por núcleo.',
        '<strong>Caché:</strong> memoria ultrarrápida dentro del CPU para los datos más usados.'
      ] },
      { t: 'aviso', v: 'El CPU es de los componentes más delicados. Nunca toques sus pines o contactos, y alinea siempre el triángulo dorado con la marca del socket antes de asentarlo.' },
      { t: 'dato', v: 'El triángulo dorado en una esquina del CPU no es decorativo: marca la orientación correcta. Colocarlo al revés puede doblar los pines y arruinar el procesador.' },
      { t: 'specs', v: { 'Núcleos/Hilos': '12C / 24T', 'Frecuencia base': '3.7 GHz', 'Boost': '4.8 GHz', 'Caché L3': '64 MB', 'TDP': '105 W' } }
    ],
    terminos: ['CPU', 'Socket', 'Overclocking', 'TDP'],
    quiz: 'cpu',
    cta: 'lab'
  },

  cooler: {
    icono: '❄️',
    titulo: 'Disipador (Cooler)',
    subtitulo: 'Mantiene el CPU a temperatura segura.',
    lectura: '3 min',
    marca: 'AMD Wraith Stealth',
    bloques: [
      { t: 'p', v: 'El CPU genera mucho calor cuando trabaja. El disipador (<em>cooler</em>) extrae ese calor y lo dispersa para que el procesador se mantenga en una temperatura segura. Sin él, el CPU se apagaría en segundos para no dañarse.' },
      { t: 'h', v: 'Cómo enfría' },
      { t: 'ul', v: [
        'Una base metálica toca el CPU y absorbe su calor.',
        'La <strong>pasta térmica</strong> rellena los microporos entre ambos para conducir mejor el calor.',
        'El calor sube por las aletas o los <em>heatpipes</em> y un ventilador lo expulsa.',
        'El ventilador PWM ajusta su velocidad según la temperatura: más calor, más revoluciones.'
      ] },
      { t: 'dato', v: 'Si la temperatura sigue subiendo pese al disipador, el CPU hace <em>throttling</em>: baja su velocidad para enfriarse. Por eso una mala refrigeración se siente como una PC lenta.' },
      { t: 'specs', v: { 'Tipo': 'Aire (torre baja)', 'Socket': 'AM4', 'Ventilador': '92 mm PWM', 'Disipación': 'Hasta 95 W TDP', 'Pasta térmica': 'Pre-aplicada' } }
    ],
    terminos: ['Cooler', 'TDP', 'Throttling', 'Airflow'],
    quiz: 'cooler',
    cta: 'lab'
  },

  ram: {
    icono: '🧮',
    titulo: 'Memoria RAM',
    subtitulo: 'El espacio de trabajo del procesador.',
    lectura: '3 min',
    marca: 'G.Skill Trident Z Neo · 32 GB',
    bloques: [
      { t: 'p', v: 'La RAM (<em>Random Access Memory</em>) es la memoria de trabajo del CPU: guarda los datos y programas que se están usando <strong>en este momento</strong> para que el procesador los tenga al instante. Es rapidísima, pero volátil: al apagar el equipo, se borra.' },
      { t: 'h', v: 'Cuánta y cómo' },
      { t: 'ul', v: [
        'A más RAM, más programas y pestañas abiertos sin que la PC se ralentice.',
        'Se instala en <strong>pares</strong> y en ranuras del mismo color para activar <strong>Dual Channel</strong>.',
        'Dual Channel duplica el ancho de banda entre el CPU y la memoria.',
        'Cada módulo encaja con un clic: los seguros laterales se cierran solos al presionar.'
      ] },
      { t: 'dato', v: 'Una muesca descentrada en el conector impide instalar la RAM al revés o en una placa incompatible. Si no entra suave, está mal orientada.' },
      { t: 'specs', v: { 'Capacidad': '32 GB (2×16 GB)', 'Tipo': 'DDR4', 'Velocidad': '3600 MHz', 'Latencia': 'CL16', 'Voltaje': '1.35 V' } }
    ],
    terminos: ['RAM', 'Dual Channel', 'Motherboard'],
    quiz: 'ram',
    cta: 'lab'
  },

  storage: {
    icono: '💾',
    titulo: 'Almacenamiento NVMe',
    subtitulo: 'Donde vive el sistema y tus archivos.',
    lectura: '3 min',
    marca: 'Samsung 990 PRO · 1 TB',
    bloques: [
      { t: 'p', v: 'El almacenamiento guarda de forma <strong>permanente</strong> el sistema operativo, los programas y tus archivos, incluso con la PC apagada. Un SSD NVMe es la variante más veloz: se conecta directo a la placa por PCIe, sin cables.' },
      { t: 'h', v: 'SSD NVMe vs. disco duro' },
      { t: 'ul', v: [
        'El SSD NVMe no tiene partes móviles: es silencioso y resistente a golpes.',
        'Es decenas de veces más rápido que un disco duro mecánico (HDD).',
        'Se instala en la ranura <strong>M.2</strong>, en ángulo, y se fija con un tornillo.',
        'Con estas velocidades, el sistema arranca en pocos segundos.'
      ] },
      { t: 'dato', v: 'HDD y SSD no compiten solo en velocidad: el HDD suele dar más capacidad por dólar, así que muchos equipos usan un SSD para el sistema y un HDD para archivar.' },
      { t: 'specs', v: { 'Capacidad': '1 TB', 'Factor de forma': 'M.2 2280', 'Interfaz': 'PCIe 4.0 ×4', 'Lectura': '7450 MB/s', 'Escritura': '6900 MB/s' } }
    ],
    terminos: ['SSD', 'HDD', 'NVMe', 'M.2'],
    quiz: 'storage',
    cta: 'lab'
  },

  gpu: {
    icono: '🎮',
    titulo: 'Tarjeta gráfica (GPU)',
    subtitulo: 'El motor de todo lo que ves.',
    lectura: '4 min',
    marca: 'NVIDIA GeForce RTX 3090',
    bloques: [
      { t: 'p', v: 'La tarjeta gráfica o GPU (<em>Graphics Processing Unit</em>) procesa todo lo visual: el escritorio, los videos y, sobre todo, los juegos y el 3D. Mientras el CPU es bueno resolviendo tareas complejas una por una, la GPU brilla haciendo <strong>miles de cálculos simples en paralelo</strong>.' },
      { t: 'h', v: 'Qué la hace potente' },
      { t: 'ul', v: [
        '<strong>Núcleos en paralelo:</strong> miles de ellos dibujan la imagen al mismo tiempo.',
        '<strong>VRAM:</strong> memoria dedicada para texturas y modelos 3D de alta resolución.',
        '<strong>Ray Tracing:</strong> simula la iluminación real en tiempo real.',
        'Se instala en el slot <strong>PCIe ×16</strong> y suele necesitar cables de energía dedicados.'
      ] },
      { t: 'dato', v: 'La GPU es, con frecuencia, el componente que más energía consume de toda la PC. Por eso una tarjeta potente exige una fuente potente y estable.' },
      { t: 'specs', v: { 'Arquitectura': 'Ampere', 'VRAM': '24 GB GDDR6X', 'Núcleos CUDA': '10496', 'Bus': '384-bit', 'Consumo': '350 W' } }
    ],
    terminos: ['GPU', 'VRAM', 'PCIe', 'TDP'],
    quiz: 'gpu',
    cta: 'lab'
  },

  power: {
    icono: '⚡',
    titulo: 'Fuente de poder (PSU)',
    subtitulo: 'El corazón eléctrico del sistema.',
    lectura: '3 min',
    marca: 'EVGA SuperNOVA 850 G6',
    bloques: [
      { t: 'p', v: 'La fuente de poder (<em>PSU</em>) convierte la corriente alterna del enchufe en los voltajes continuos y estables (12V, 5V, 3.3V) que cada componente necesita. Es la pieza de la que depende que todo lo demás funcione con seguridad.' },
      { t: 'h', v: 'Qué mirar en una fuente' },
      { t: 'ul', v: [
        '<strong>Potencia (W):</strong> debe cubrir el consumo total con margen. La GPU manda aquí.',
        '<strong>Certificación 80 Plus:</strong> mide su eficiencia (Bronze, Gold, Platinum…). A más eficiente, menos calor y menos gasto eléctrico.',
        '<strong>Cableado modular:</strong> conectas solo los cables que usas, para un montaje limpio.',
        '<strong>Protecciones:</strong> cortan la energía ante picos o cortocircuitos y evitan daños.'
      ] },
      { t: 'dato', v: 'Una fuente de baja calidad es un riesgo real: si falla, puede llevarse otros componentes con ella. Es la última pieza donde conviene ahorrar.' },
      { t: 'specs', v: { 'Potencia': '850 W', 'Certificación': '80 Plus Gold', 'Cableado': '100% modular', 'Ventilador': '135 mm FDB', 'Protecciones': 'OCP / OVP / SCP' } }
    ],
    terminos: ['PSU', 'ATX', 'TDP'],
    quiz: 'power',
    cta: 'calculadora'
  },

  // -------------------------------------------------------------------- CIERRE
  'orden-de-montaje': {
    icono: '🔩',
    titulo: 'El orden correcto de montaje',
    subtitulo: 'Por qué se arma en esta secuencia y no en otra.',
    lectura: '4 min',
    bloques: [
      { t: 'p', v: 'El orden de ensamblaje no es un capricho: cada paso deja espacio y acceso para el siguiente. Montar en la secuencia correcta evita tener que desarmar lo ya hecho. Este es el mismo orden que sigues en el laboratorio 3D.' },
      { t: 'h', v: 'La secuencia, paso a paso' },
      { t: 'ul', v: [
        '<strong>1. Gabinete:</strong> tu espacio de trabajo y la estructura base.',
        '<strong>2. Placa base:</strong> se atornilla a la bandeja del gabinete.',
        '<strong>3. CPU:</strong> se asienta en el socket con la placa aún despejada.',
        '<strong>4. Disipador:</strong> justo encima del CPU, con su pasta térmica.',
        '<strong>5. RAM:</strong> en las ranuras, fácil de presionar sin estorbos.',
        '<strong>6. SSD NVMe:</strong> en el slot M.2 antes de que la GPU tape el acceso.',
        '<strong>7. Tarjeta gráfica:</strong> en el PCIe ×16, ya casi al final.',
        '<strong>8. Fuente de poder:</strong> abajo, y por último se conectan todos los cables.'
      ] },
      { t: 'dato', v: 'Fíjate en el patrón: primero lo que va "adentro y en el centro" (CPU, RAM), luego lo grande que tapa el acceso (GPU) y al final la energía. Colocar la GPU antes que el SSD te obligaría a quitarla después.' },
      { t: 'p', v: 'En el laboratorio 3D vives este orden en primera persona: cada componente solo se desbloquea cuando el anterior está en su sitio.' }
    ],
    terminos: ['Motherboard', 'M.2', 'PCIe'],
    cta: 'lab'
  },

  'primer-arranque': {
    icono: '🚀',
    titulo: 'Primer arranque: POST y BIOS',
    subtitulo: 'Qué ocurre la primera vez que presionas encender.',
    lectura: '4 min',
    bloques: [
      { t: 'p', v: 'Terminaste el montaje y presionas el botón de encendido. Antes de que aparezca cualquier logo, la placa base ejecuta una rutina de comprobación llamada <strong>POST</strong>. Entender esta fase te convierte en alguien capaz de diagnosticar, no solo de armar.' },
      { t: 'h', v: 'La secuencia de encendido' },
      { t: 'ul', v: [
        '<strong>POST</strong> (<em>Power-On Self-Test</em>): la placa verifica que el CPU, la RAM y el video respondan.',
        'Si algo falla, lo avisa con <strong>pitidos</strong> o <strong>LEDs de diagnóstico</strong> (CPU, DRAM, VGA, BOOT).',
        'Si todo está bien, entra en juego el <strong>BIOS/UEFI</strong>, el firmware de la placa.',
        'El UEFI localiza el disco con el sistema operativo y le cede el control.'
      ] },
      { t: 'dato', v: 'Esos LEDs de la placa son tu mejor amigo al diagnosticar: si se queda encendido el LED "DRAM", el problema está en la memoria; si es "VGA", en el video. Es exactamente lo que practicas en los Retos de reparación.' },
      { t: 'h', v: 'De la teoría a la práctica' },
      { t: 'p', v: 'Ahora tienes el mapa completo: sabes qué hace cada pieza, cómo encajan, en qué orden se montan y qué pasa al encender. El siguiente paso es aplicarlo: arma tu PC en el laboratorio 3D y luego pon a prueba tu diagnóstico en los Retos de reparación.' }
    ],
    terminos: ['POST', 'BIOS / UEFI', 'Motherboard'],
    cta: 'retos'
  }
}

// Devuelve un índice plano [{id, moduloId, moduloNombre, ...leccion}] en orden de recorrido.
export function leccionesEnOrden() {
  const lista = []
  for (const modulo of MODULOS) {
    for (const id of modulo.lecciones) {
      const lec = LECCIONES[id]
      if (lec) lista.push({ id, moduloId: modulo.id, moduloNombre: modulo.nombre, ...lec })
    }
  }
  return lista
}
