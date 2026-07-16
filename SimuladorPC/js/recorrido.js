
export const NOTA_MINIMA_ETAPA = 7

function etapaAcademia(estadoAcademia) {
    const total = estadoAcademia?.totalLecciones || 0
    const hechas = estadoAcademia?.leccionesCompletadas || 0
    return {
        id: 'academia',
        label: 'Academia',
        icono: '🎓',
        pct: total ? Math.round((hechas / total) * 100) : 0,
        nota: estadoAcademia?.notaSobre10 || 0,
        completa: !!estadoAcademia?.aprobada,
        bloqueada: false
    }
}

function etapaSimulador(progreso, academiaCompleta) {
    const webAprobado = !!progreso?.web_aprobado_at


    const nota = Number(progreso?.nota_web) || 0
    return {
        id: 'simulador',
        label: 'Simulador',
        icono: '🖥️',
        pct: webAprobado ? 100 : Math.round((Math.min(Math.max(nota, 0), 10) / 10) * 100),
        nota,
        completa: webAprobado,
        bloqueada: !academiaCompleta
    }
}

function etapaRetos(resumenRetos, retos, academiaCompleta) {
    const total = retos.length

    const notas = retos.map(r => Number(resumenRetos?.[r.id]?.nota) || 0)
    const superados = retos.filter(r => resumenRetos?.[r.id]?.exito).length
    const notaProm = total ? notas.reduce((a, b) => a + b, 0) / total : 0
    return {
        id: 'retos',
        label: 'Retos',
        icono: '🔧',
        pct: total ? Math.round((superados / total) * 100) : 0,
        nota: Math.round(notaProm * 10) / 10,
        completa: total > 0 && superados >= total,
        bloqueada: !academiaCompleta
    }
}

export function calcularRecorrido({ estadoAcademia, progreso = {}, resumenRetos = {}, retos = [] } = {}) {
    const academia = etapaAcademia(estadoAcademia)
    const simulador = etapaSimulador(progreso, academia.completa)
    const retosEtapa = etapaRetos(resumenRetos, retos, academia.completa)
    const etapas = [academia, simulador, retosEtapa]

    const pctGeneral = Math.round(etapas.reduce((s, e) => s + e.pct, 0) / etapas.length)
    const notaFinal = Math.round((etapas.reduce((s, e) => s + e.nota, 0) / etapas.length) * 10) / 10
    const todoCompleto = etapas.every(e => e.completa)

    const aptoMovil = todoCompleto && notaFinal >= NOTA_MINIMA_ETAPA

    const etapaActualIdx = etapas.findIndex(e => !e.completa)

    return { etapas, pctGeneral, notaFinal, todoCompleto, aptoMovil, etapaActualIdx }
}
