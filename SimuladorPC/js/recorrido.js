// recorrido.js
// El "camino" completo de LogicFlow tiene 3 etapas obligatorias, en este orden:
// Academia (teoría) → Simulador (ensamble web) → Retos (diagnóstico y reparación).
// Cada una ya tenía su propia nota dispersa por el panel (academia_nota, nota_web,
// nota por reto); esta función las reúne en un solo resumen para la barra grande
// del panel y para decidir si el estudiante puede continuar en la app móvil.
//
// Lógica pura y testeable (sin DOM ni red), igual que recomendacion.js.

// Nota mínima (sobre 10) para considerar una etapa "aprobada". Coincide con los
// umbrales que YA exige cada etapa por separado (academia-api.js UMBRAL_APROBACION_ACADEMIA,
// NOTA_MINIMA en juego.js, NOTA_MINIMA_RETO en retos-data.js son todos 7/10):
// un mismo estándar de "buena calificación" en todo LogicFlow.
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
        bloqueada: false // la Academia siempre está disponible, es el punto de partida.
    }
}

function etapaSimulador(progreso, academiaCompleta) {
    const webAprobado = !!progreso?.web_aprobado_at
    // marcarAprobacionWeb() solo se llama cuando la nota ya es >= NOTA_MINIMA (juego.js),
    // así que web_aprobado_at implica automáticamente una nota que ya pasó el umbral.
    const nota = Number(progreso?.nota_web) || 0
    return {
        id: 'simulador',
        label: 'Simulador',
        icono: '🖥️',
        pct: webAprobado ? 100 : Math.round((Math.min(nota, 10) / 10) * 100),
        nota,
        completa: webAprobado,
        bloqueada: !academiaCompleta // gate real: js/juego.js exige Academia aprobada.
    }
}

function etapaRetos(resumenRetos, retos, academiaCompleta) {
    const total = retos.length
    // Los retos no intentados cuentan como 0 en el promedio: igual que la Academia
    // exige leer TODAS las lecciones, aquí se exige intentar (y aprobar) TODOS los
    // retos para que la etapa quede "completa" y la nota refleje el trabajo real.
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
        bloqueada: !academiaCompleta // mismo gate: ensamble y retos viven en juego.html.
    }
}

// Combina Academia + Simulador + Retos en un solo resumen de recorrido.
//   estadoAcademia: resultado de estadoAcademia() en academia-api.js.
//   progreso:       fila de progreso_usuario (nota_web, web_aprobado_at, ...).
//   resumenRetos:   resultado de resumirResultados() en retos-api.js.
//   retos:          catálogo RETOS de retos-data.js.
export function calcularRecorrido({ estadoAcademia, progreso = {}, resumenRetos = {}, retos = [] } = {}) {
    const academia = etapaAcademia(estadoAcademia)
    const simulador = etapaSimulador(progreso, academia.completa)
    const retosEtapa = etapaRetos(resumenRetos, retos, academia.completa)
    const etapas = [academia, simulador, retosEtapa]

    const pctGeneral = Math.round(etapas.reduce((s, e) => s + e.pct, 0) / etapas.length)
    const notaFinal = Math.round((etapas.reduce((s, e) => s + e.nota, 0) / etapas.length) * 10) / 10
    const todoCompleto = etapas.every(e => e.completa)
    // Se exigen las DOS cosas: terminar las 3 etapas Y que el promedio no baje del
    // estándar. En la práctica casi siempre coinciden (cada etapa ya exige >=7 para
    // marcarse "completa"), pero el chequeo explícito evita que un promedio alto con
    // una etapa a medias (p. ej. solo 5/8 retos) se lea como "apto".
    const aptoMovil = todoCompleto && notaFinal >= NOTA_MINIMA_ETAPA

    const etapaActualIdx = etapas.findIndex(e => !e.completa)

    return { etapas, pctGeneral, notaFinal, todoCompleto, aptoMovil, etapaActualIdx }
}
