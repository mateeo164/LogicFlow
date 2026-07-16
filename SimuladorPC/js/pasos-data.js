
import * as THREE from "three"

export const PASOS = [
    {
        id: 'case', brand: 'NZXT', nombre: 'Gabinete',
        modelo: 'H510 Mid Tower', subtitulo: 'La estructura que protege y organiza',
        color: 0x60a5fa,
        ruta: 'assets/3d_models/computer_case_based_off_of_nzxt_510b/scene.opt.glb',
        size: 1.7, pos: new THREE.Vector3(0, 0.85, 0), rot: { x: 0, y: 0, z: 0 },
        specs: { 'Formato': 'Mid Tower ATX', 'Material': 'Acero + Vidrio templado', 'Bahías': '2.5" / 3.5"', 'Ventiladores': 'Hasta 7', 'Gestión de cables': 'Trasera' },
        hechos: [
            'El gabinete protege los componentes del polvo y los golpes',
            'Su diseño de flujo de aire mantiene fría toda la configuración',
            'Compatible con placas ATX, micro-ATX y mini-ITX',
            'Panel lateral de vidrio templado para mostrar el interior',
            'Gestión de cables trasera para un montaje limpio y ordenado'
        ],
        video: 'assets/Video/Gabinete.mp4',
        drone: {
            video:       'El gabinete es el esqueleto de tu PC: aloja y protege todos los componentes. Fíjate en sus bahías, soportes y zonas de ventilación.',
            instalacion: 'Coloca el gabinete en tu mesa de trabajo. Haz clic en el disco luminoso para posicionarlo y empezar el montaje.',
            exito:       '¡Listo! El gabinete está en su lugar. Empecemos por los ventiladores para el flujo de aire.'
        }
    },
    {

        id: 'fans', brand: 'Lian Li', nombre: 'Ventiladores de Gabinete',
        modelo: 'UNI FAN 120 ARGB', subtitulo: 'Mantienen el aire fresco circulando',
        color: 0x38bdf8,
        ruta: 'assets/3d_models/rgb_pc_fan.opt.glb',
        size: 0.32, pos: new THREE.Vector3(0.18, 1.05, 0.20), rot: { x: 0, y: 0, z: 0 },
        specs: { 'Tamaño': '120 mm', 'Flujo de aire': '58 CFM', 'Velocidad': '1900 RPM', 'Conector': 'PWM 4-pin', 'Iluminación': 'ARGB' },
        hechos: [
            'Los ventiladores crean un flujo de aire que expulsa el calor del gabinete',
            'Entra aire frío por el frente y sale el caliente por atrás y arriba',
            'Una presión de aire positiva reduce la acumulación de polvo',
            'El conector PWM regula su velocidad según la temperatura',
            'La iluminación ARGB se sincroniza con el resto del sistema'
        ],
        video: 'assets/Video/Ventilador.mp4',
        drone: {
            video:       'Los ventiladores mantienen todo el sistema fresco. Fíjate en la dirección de las aspas: marcan por dónde entra y sale el aire.',
            instalacion: 'Selecciona los ventiladores y colócalos en el frente del gabinete para crear el flujo de aire de entrada.',
            exito:       '¡Genial! Con la ventilación lista, el aire circulará y todo se mantendrá fresco. Sigamos con la placa base.'
        }
    },
    {
        id: 'mb', brand: 'ASUS ROG', nombre: 'Placa Base',
        modelo: 'Strix X570-E Gaming', subtitulo: 'El núcleo que conecta todo',
        color: 0x22c55e,
        ruta: 'assets/3d_models/rog_strix_x370-f_motherboard/scene.opt.glb',
        size: 1.3, pos: new THREE.Vector3(-0.30, 1.03, -0.22), rot: { x: 0, y: 0, z: 0 },

        shelfRotX: -Math.PI / 18,
        shelfRotY: -Math.PI / 12,
        shelfScale: 1.12,
        shelfOffsetY: 0.018,
        specs: { 'Socket': 'AM4', 'Formato': 'ATX', 'Chipset': 'AMD X570', 'Memoria': '4× DDR4 (Máx 128 GB)', 'PCIe': 'PCIe 4.0 ×16' },
        hechos: [
            'La placa base conecta y comunica todos los componentes entre sí',
            'El socket AM4 es compatible con procesadores Ryzen 3000–5000',
            '4 ranuras DDR4 admiten hasta 128 GB de memoria RAM',
            'Incluye slots M.2 para almacenamiento NVMe ultrarrápido',
            'Distribuye la energía de la fuente a cada componente'
        ],
        video: 'assets/Video/Placa base.mp4',
        drone: {
            video:       'La placa base es el componente central: todo se conecta a ella. Observa el socket del CPU, las ranuras de RAM y los slots PCIe.',
            instalacion: 'Selecciona la placa base en la vitrina y haz clic en el disco luminoso dentro del gabinete para atornillarla a la bandeja.',
            exito:       '¡Excelente! La placa base está fijada. Es la columna vertebral de todo el sistema.'
        }
    },
    {
        id: 'cpu', brand: 'AMD', nombre: 'Procesador (CPU)',
        modelo: 'Ryzen 9 5900X', subtitulo: 'El cerebro del computador',
        color: 0x00e5ff,
        ruta: 'assets/3d_models/amd_ryzen/scene.opt.glb',
        size: 0.20, pos: new THREE.Vector3(-0.24, 1.26, -0.27), rot: { x: Math.PI / 2, y: 0, z: 0 },
        specs: { 'Núcleos/Hilos': '12C / 24T', 'Frecuencia Base': '3.7 GHz', 'Boost': '4.8 GHz', 'Caché L3': '64 MB', 'TDP': '105 W' },
        hechos: [
            'El procesador ejecuta las instrucciones de todos los programas',
            '12 núcleos físicos procesan hasta 24 hilos en simultáneo',
            'Frecuencia boost de 4.8 GHz para tareas exigentes',
            'El triángulo dorado indica la orientación correcta en el socket',
            'Es uno de los componentes más delicados: nunca toques sus pines'
        ],
        video: 'assets/Video/Cpu.mp4',
        drone: {
            video:       'El procesador es el cerebro del PC. Atiende cómo alinear el triángulo dorado del chip con la marca del socket antes de instalarlo.',
            instalacion: 'Selecciona el CPU y colócalo en el socket AM4 de la placa. Respeta la orientación del triángulo dorado.',
            exito:       '¡Perfecto! El Ryzen 9 está asentado en el socket. Ahora debemos refrigerarlo.'
        }
    },
    {
        id: 'cooler', brand: 'AMD', nombre: 'Disipador (Cooler)',
        modelo: 'Wraith Stealth', subtitulo: 'Mantiene el CPU a temperatura segura',
        color: 0xf59e0b,
        ruta: 'assets/3d_models/amd_wraith_stealth_cpu_cooler/scene.opt.glb',
        size: 0.7, pos: new THREE.Vector3(-0.1, 1.28, -0.15), rot: { x: Math.PI / 2, y: 0, z: 0 },
        specs: { 'Tipo': 'Aire (torre baja)', 'Socket': 'AM4', 'Ventilador': '92 mm PWM', 'Disipación': 'Hasta 95 W TDP', 'Pasta térmica': 'Pre-aplicada' },
        hechos: [
            'El disipador extrae el calor que genera el procesador',
            'Sin refrigeración, el CPU se apagaría para protegerse en segundos',
            'La pasta térmica mejora la transferencia de calor al disipador',
            'El ventilador PWM ajusta su velocidad según la temperatura',
            'Se fija con clips o tornillos justo encima del procesador'
        ],
        video: 'assets/Video/Disipador.mp4',
        drone: {
            video:       'El disipador evita que el procesador se sobrecaliente. La pasta térmica rellena los microporos para conducir mejor el calor.',
            instalacion: 'Selecciona el disipador y colócalo justo encima del procesador. El ventilador queda mirando hacia arriba.',
            exito:       '¡Muy bien! El CPU ya está refrigerado y protegido. Continuemos con la memoria.'
        }
    },
    {
        id: 'ram', brand: 'G.Skill', nombre: 'Memoria RAM',
        modelo: 'Trident Z Neo 32 GB', subtitulo: 'El espacio de trabajo del CPU',
        color: 0x7c4dff,
        ruta: 'assets/3d_models/ram_ddr4_g.skill_trident_z_neo/scene.opt.glb',
        size: 0.60, pos: new THREE.Vector3(0.0, 1.27, -0.20), rot: { x: 0, y: 1.8, z: 1.5708 },

        specs: { 'Capacidad': '32 GB (2×16 GB)', 'Tipo': 'DDR4', 'Velocidad': '3600 MHz', 'Latencia': 'CL16', 'Voltaje': '1.35 V' },
        hechos: [
            'La RAM es la memoria de trabajo temporal del procesador',
            'A más RAM, más programas abiertos sin perder fluidez',
            'Se instala en pares para activar el modo Dual Channel',
            'Dual Channel duplica el ancho de banda entre CPU y RAM',
            'Los módulos encajan con un clic en las ranuras de la placa'
        ],
        drone: {
            video:       'La RAM guarda los datos que el procesador usa en el momento. Se instala en pares y en las ranuras del mismo color para Dual Channel.',
            instalacion: 'Selecciona la RAM y colócala en las ranuras DDR4 de la placa. Presiona hasta escuchar el clic de los seguros.',
            exito:       '¡Bien hecho! 32 GB de DDR4 instalados. El sistema podrá ejecutar varias tareas pesadas a la vez.'
        }
    },
    {
        id: 'storage', brand: 'Samsung', nombre: 'Almacenamiento NVMe',
        modelo: '990 PRO 1 TB', subtitulo: 'Velocidad de transferencia extrema',
        color: 0x26a69a,
        ruta: 'assets/3d_models/m.2_nvme_ssd_samsung_990_pro_1tb_3d_model/scene.opt.glb',
        size: 0.3, pos: new THREE.Vector3(-0.05, 0.55, -0.28), rot: { x: 1.5708, y: 0, z: 0 },
        specs: { 'Capacidad': '1 TB', 'Factor Forma': 'M.2 2280', 'Interfaz': 'PCIe Gen 4.0 ×4', 'Lectura': '7450 MB/s', 'Escritura': '6900 MB/s' },
        hechos: [
            'El SSD NVMe almacena el sistema operativo y tus archivos',
            'Es hasta 47 veces más rápido que un disco duro mecánico',
            'Se conecta directo a la placa base, sin cables (slot M.2)',
            'Sin partes móviles: más silencioso y resistente que un HDD',
            'Con 7450 MB/s, el sistema arranca en pocos segundos'
        ],
        drone: {
            video:       'El SSD M.2 NVMe es el almacenamiento más rápido. Se inserta en ángulo en el slot M.2 y se asegura con un tornillo, ¡sin cables!',
            instalacion: 'Selecciona el SSD y colócalo en el slot M.2 de la placa base. Se inserta en ángulo y luego se baja para fijarlo.',
            exito:       '¡Increíble! Almacenamiento ultrarrápido instalado. Ahora sumemos un disco duro para el almacenamiento masivo.'
        }
    },
    {

        id: 'hdd', brand: 'Western Digital', nombre: 'Disco Duro (HDD)',
        modelo: 'WD Green 1 TB', subtitulo: 'Almacenamiento masivo y económico',
        color: 0x84cc16,
        ruta: 'assets/3d_models/wd_green_1tb_hard_disk_hdd.opt.glb',
        size: 0.42, pos: new THREE.Vector3(0.20, 0.50, 0.08), rot: { x: 0, y: 0, z: 0 },
        specs: { 'Capacidad': '1 TB', 'Formato': '3.5"', 'Interfaz': 'SATA III', 'Velocidad': '5400 RPM', 'Caché': '64 MB' },
        hechos: [
            'El disco duro guarda grandes cantidades de datos a bajo costo',
            'Usa platos magnéticos que giran y un cabezal que lee y escribe',
            'Es más lento que un SSD, pero ofrece mucha más capacidad por el precio',
            'Ideal para archivos, fotos, videos y copias de seguridad',
            'Se conecta a la placa base con un cable de datos SATA'
        ],
        drone: {
            video:       'El disco duro mecánico ofrece mucho espacio barato. Necesita DOS cables: uno de datos (SATA) y uno de energía de la fuente.',
            instalacion: 'Selecciona el disco duro y colócalo en la bahía de 3.5" del gabinete, en la zona inferior.',
            exito:       '¡Bien! Ya tienes almacenamiento masivo. Ahora conectémoslo con su cable de datos SATA.'
        }
    },
    {

        id: 'sata', brand: 'SATA', nombre: 'Cable de Datos SATA',
        modelo: 'SATA III 6 Gb/s', subtitulo: 'Comunica el disco con la placa base',
        color: 0xef4444,
        ruta: 'assets/3d_models/sata_cable.opt.glb',
        size: 0.30, pos: new THREE.Vector3(0.05, 0.62, -0.02), rot: { x: 0, y: 0, z: 0 },
        specs: { 'Estándar': 'SATA III', 'Ancho de banda': '6 Gb/s', 'Conector': '7 pines', 'Longitud': '50 cm', 'Traba': 'Clip de seguridad' },
        hechos: [
            'El cable SATA transporta los datos entre el disco y la placa base',
            'Tiene un conector en "L" que solo entra en la orientación correcta',
            'SATA III alcanza hasta 6 Gb/s, suficiente para discos mecánicos',
            'El clip metálico evita que se desconecte por la vibración',
            'Es distinto del cable de energía SATA, que viene de la fuente'
        ],
        video: 'assets/Video/cable-sata-datos.mp4',
        drone: {
            video:       'El cable SATA es la vía de datos del disco. Su forma en "L" impide conectarlo al revés: fíjate en la muesca.',
            instalacion: 'Selecciona el cable SATA y conéctalo entre el disco duro y el puerto SATA de la placa base.',
            exito:       '¡Conectado! El disco ya puede comunicarse con el sistema. Ahora la parte visual: la tarjeta gráfica.'
        }
    },
    {
        id: 'gpu', brand: 'NVIDIA', nombre: 'Tarjeta Gráfica (GPU)',
        modelo: 'GeForce RTX 3090', subtitulo: 'Motor de procesamiento visual',
        color: 0x10b981,
        ruta: 'assets/3d_models/nvidia_geforce_rtx_3090/scene.opt.glb',
        size: 1.0, pos: new THREE.Vector3(-0.36, 0.86, -0.06), rot: { x: -1.5708, y: 0, z: 0 },
        specs: { 'Arquitectura': 'Ampere', 'VRAM': '24 GB GDDR6X', 'CUDA Cores': '10496', 'Bus': '384-bit', 'Consumo': '350 W' },
        hechos: [
            'La GPU procesa todo lo que ves: escritorio, juegos y video',
            '10496 núcleos CUDA trabajan en paralelo para los gráficos',
            '24 GB de VRAM para texturas y modelos 3D de alta resolución',
            'Ray Tracing: simula la iluminación real en tiempo real',
            'Por su consumo, exige una fuente de poder potente y estable'
        ],
        video: 'assets/Video/gpu-nvidia-rtx3090.mp4',
        drone: {
            video:       'La GPU es responsable de todos los gráficos. Se inserta en el slot PCIe ×16 y se alimenta con cables dedicados de la fuente.',
            instalacion: 'Selecciona la GPU y colócala en el slot PCIe ×16 principal. Escucharás el clic del seguro al encajar.',
            exito:       '¡Espectacular! La tarjeta gráfica está montada. Solo falta darle energía a todo el sistema.'
        }
    },
    {
        id: 'power', brand: 'EVGA', nombre: 'Fuente de Poder (PSU)',
        modelo: 'SuperNOVA 850 G6', subtitulo: 'El corazón eléctrico del sistema',
        color: 0xff5f7e,
        ruta: 'assets/3d_models/psu_power_supply_unit/scene.opt.glb',
        size: 0.8, pos: new THREE.Vector3(-0.48, 0.36, 0), rot: { x: 0, y: 1.5708, z: 0 },
        specs: { 'Potencia': '850 W', 'Certificación': '80 Plus Gold', 'Cableado': '100% Modular', 'Ventilador': '135 mm FDB', 'Protecciones': 'OCP / OVP / SCP' },
        hechos: [
            'La fuente convierte la corriente del enchufe en energía para el PC',
            '850 W alimentan con holgura una RTX 3090 y un Ryzen 9',
            'Certificación 80 Plus Gold: alta eficiencia, menos calor',
            'Cableado modular: solo conectas los cables que necesitas',
            'Sus protecciones evitan daños por picos o cortocircuitos'
        ],
        video: 'assets/Video/psu-evga-supernova-850g6.mp4',
        drone: {
            video:       'La fuente de poder suministra energía limpia y estable a todos los componentes. Va en el compartimento inferior del gabinete.',
            instalacion: 'Selecciona la fuente y colócala en el compartimento inferior del gabinete para conectar la energía a todo.',
            exito:       '¡ENSAMBLAJE COMPLETO! 🎉 Has construido una PC de alto rendimiento de principio a fin. ¡Excelente trabajo!'
        }
    }
]
