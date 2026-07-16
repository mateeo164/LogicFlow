export const UMBRAL_COMPRENSION = 70

export function recomendarSiguiente({ progreso = {}, resumenRetos = {}, retos = [], componentes = [] } = {}) {
    const instalados = progreso?.componentes_instalados || []
    const nInstalados = instalados.length
    const totalComp = componentes.length || 0
    const webAprobado = !!progreso?.web_aprobado_at
    const movilOk = !!progreso?.movil_completado_at
    const comprension = progreso?.comprension_pct

    const retosPendientes = (retos || []).filter(r => !resumenRetos?.[r.id]?.exito)

    if (!webAprobado && nInstalados === 0) {
        return {
            id: 'empezar-teoria',
            icono: '📚',
            titulo: 'Empieza por la teoría',
            razon: 'Aún no has comenzado. Un repaso corto en la Academia te dará la base para armar tu primera PC con confianza.',
            accion: { label: 'Ir a la Academia', href: 'academia.html' }
        }
    }

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

    if (comprension != null && Number(comprension) < UMBRAL_COMPRENSION) {
        return {
            id: 'reforzar-teoria',
            icono: '🧠',
            titulo: 'Refuerza los conceptos',
            razon: `Aprobaste el ensamble, pero tu comprensión va en ${Math.round(Number(comprension))}%. Repasar la teoría afianzará el porqué de cada pieza.`,
            accion: { label: 'Repasar en la Academia', href: 'academia.html' }
        }
    }

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

    if (!movilOk) {
        return {
            id: 'app-movil',
            icono: '📱',
            titulo: 'Termina en la app móvil',
            razon: 'Completaste todo el simulador web. Realiza la instalación real guiada en la app móvil para desbloquear tu certificado.',
            accion: { label: 'Continuar en la app móvil', href: null }
        }
    }

    return {
        id: 'certificado',
        icono: '🎓',
        titulo: '¡Completaste LogicFlow!',
        razon: 'Terminaste el ensamble, los retos y la parte móvil. Abre la app móvil para generar y compartir tu certificado.',
        accion: { label: 'Ver mi certificado (en el móvil)', href: null }
    }
}
