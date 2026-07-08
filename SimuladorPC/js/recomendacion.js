// recomendacion.js
// Motor de recomendación adaptativa: a partir de los datos que el sistema YA
// recolecta (progreso de ensamble, comprensión conceptual, retos superados),
// decide el "siguiente mejor paso" para el estudiante y lo muestra en su panel.
//
// Cierra el bucle pedagógico: hasta ahora esos datos solo se MOSTRABAN; aquí se
// usan para GUIAR. La lógica es pura y testeable (sin DOM ni red).
//
// Prioridad (se evalúa de arriba hacia abajo; gana la primera que aplica):
//   1. Nunca empezó            → arrancar por la teoría (Academia)
//   2. Ensamble a medias       → volver al laboratorio 3D
//   3. Aprobó pero no entendió  → reforzar la teoría (comprensión baja)
//   4. Retos pendientes        → el reto de reparación más fácil sin superar
//   5. Falta la parte móvil    → continuar en la app
//   6. Todo completo           → certificado

export const UMBRAL_COMPRENSION = 70   // % de comprensión por debajo del cual conviene repasar

export function recomendarSiguiente({ progreso = {}, resumenRetos = {}, retos = [], componentes = [] } = {}) {
    const instalados = progreso?.componentes_instalados || []
    const nInstalados = instalados.length
    const totalComp = componentes.length || 0
    const webAprobado = !!progreso?.web_aprobado_at
    const movilOk = !!progreso?.movil_completado_at
    const comprension = progreso?.comprension_pct

    const retosPendientes = (retos || []).filter(r => !resumenRetos?.[r.id]?.exito)

    // 1. Nunca empezó → empezar por la teoría.
    if (!webAprobado && nInstalados === 0) {
        return {
            id: 'empezar-teoria',
            icono: '📚',
            titulo: 'Empieza por la teoría',
            razon: 'Aún no has comenzado. Un repaso corto en la Academia te dará la base para armar tu primera PC con confianza.',
            accion: { label: 'Ir a la Academia', href: 'academia.html' }
        }
    }

    // 2. Ensamble a medias (no aprobado todavía) → continuar en el laboratorio.
    if (!webAprobado) {
        const siguiente = componentes.find(c => !instalados.includes(c.id))
        const pieza = siguiente ? ` El siguiente es ${siguiente.label}.` : ''
        return {
            id: 'continuar-ensamble',
            icono: '🔧',
            titulo: 'Continúa tu ensamble',
            razon: `Llevas ${nInstalados} de ${totalComp} componentes.${pieza} Termina el laboratorio 3D para aprobar el ensamble.`,
            accion: { label: 'Volver al laboratorio 3D', href: 'juego.html' }
        }
    }

    // 3. Aprobó el ensamble pero la comprensión quedó baja → reforzar teoría.
    if (comprension != null && Number(comprension) < UMBRAL_COMPRENSION) {
        return {
            id: 'reforzar-teoria',
            icono: '🧠',
            titulo: 'Refuerza los conceptos',
            razon: `Aprobaste el ensamble, pero tu comprensión va en ${Math.round(Number(comprension))}%. Repasar la teoría afianzará el porqué de cada pieza.`,
            accion: { label: 'Repasar en la Academia', href: 'academia.html' }
        }
    }

    // 4. Retos de diagnóstico pendientes → sugerir el más fácil sin superar.
    if (retosPendientes.length > 0) {
        const objetivo = [...retosPendientes].sort((a, b) => (a.dificultad || 0) - (b.dificultad || 0))[0]
        return {
            id: 'hacer-reto',
            icono: '🩺',
            titulo: 'Pon a prueba tu diagnóstico',
            razon: `Te queda${retosPendientes.length === 1 ? '' : 'n'} ${retosPendientes.length} reto${retosPendientes.length === 1 ? '' : 's'} de reparación. Empieza por el más accesible: "${objetivo.titulo}".`,
            accion: { label: `Resolver: ${objetivo.titulo}`, href: `juego.html?reto=${objetivo.id}` }
        }
    }

    // 5. Todo lo de la web hecho, falta la instalación real en el móvil.
    if (!movilOk) {
        return {
            id: 'app-movil',
            icono: '📱',
            titulo: 'Termina en la app móvil',
            razon: 'Completaste todo el simulador web. Realiza la instalación real guiada en la app móvil para desbloquear tu certificado.',
            accion: { label: 'Continuar en la app móvil', href: null }
        }
    }

    // 6. Todo completo.
    return {
        id: 'certificado',
        icono: '🎓',
        titulo: '¡Completaste LogicFlow!',
        razon: 'Terminaste el ensamble, los retos y la parte móvil. Abre la app móvil para generar y compartir tu certificado.',
        accion: { label: 'Ver mi certificado (en el móvil)', href: null }
    }
}
