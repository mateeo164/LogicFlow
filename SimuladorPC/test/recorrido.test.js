import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularRecorrido, NOTA_MINIMA_ETAPA } from '../js/recorrido.js'

const RETOS = [
    { id: 'r1' }, { id: 'r2' }, { id: 'r3' }, { id: 'r4' }
]

const ACADEMIA_VACIA = { totalLecciones: 10, leccionesCompletadas: 0, notaSobre10: 0, aprobada: false }
const ACADEMIA_APROBADA = { totalLecciones: 10, leccionesCompletadas: 10, notaSobre10: 8.75, aprobada: true }

test('estudiante nuevo: las 3 etapas en 0%, simulador y retos bloqueados', () => {
    const r = calcularRecorrido({ estadoAcademia: ACADEMIA_VACIA, progreso: {}, resumenRetos: {}, retos: RETOS })
    assert.equal(r.pctGeneral, 0)
    assert.equal(r.notaFinal, 0)
    assert.equal(r.todoCompleto, false)
    assert.equal(r.aptoMovil, false)
    assert.equal(r.etapas[1].bloqueada, true)
    assert.equal(r.etapas[2].bloqueada, true)
    assert.equal(r.etapaActualIdx, 0)
})

test('academia aprobada desbloquea simulador y retos', () => {
    const r = calcularRecorrido({ estadoAcademia: ACADEMIA_APROBADA, progreso: {}, resumenRetos: {}, retos: RETOS })
    assert.equal(r.etapas[0].completa, true)
    assert.equal(r.etapas[1].bloqueada, false)
    assert.equal(r.etapas[2].bloqueada, false)
    assert.equal(r.etapaActualIdx, 1)
})

test('retos no intentados cuentan como 0 en el promedio de la etapa', () => {
    const resumenRetos = { r1: { nota: 10, exito: true }, r2: { nota: 8, exito: true } }
    const r = calcularRecorrido({ estadoAcademia: ACADEMIA_APROBADA, progreso: {}, resumenRetos, retos: RETOS })
    const retos = r.etapas[2]
    assert.equal(retos.nota, 4.5)
    assert.equal(retos.pct, 50)
    assert.equal(retos.completa, false)
})

test('todoCompleto exige TODOS los retos superados, no solo buen promedio', () => {
    const resumenRetos = { r1: { nota: 10, exito: true }, r2: { nota: 10, exito: true }, r3: { nota: 10, exito: true } }
    const progreso = { web_aprobado_at: '2026-01-01', nota_web: 10 }
    const r = calcularRecorrido({ estadoAcademia: ACADEMIA_APROBADA, progreso, resumenRetos, retos: RETOS })
    assert.equal(r.etapas[2].nota, 7.5)
    assert.equal(r.etapas[2].completa, false)
    assert.equal(r.todoCompleto, false)
    assert.equal(r.aptoMovil, false)
})

test('las 3 etapas completas con buena nota → apto para la app móvil', () => {
    const resumenRetos = Object.fromEntries(RETOS.map(x => [x.id, { nota: 9, exito: true }]))
    const progreso = { web_aprobado_at: '2026-01-01', nota_web: 8 }
    const r = calcularRecorrido({ estadoAcademia: ACADEMIA_APROBADA, progreso, resumenRetos, retos: RETOS })
    assert.equal(r.todoCompleto, true)
    assert.equal(r.pctGeneral, 100)
    assert.ok(r.notaFinal >= NOTA_MINIMA_ETAPA)
    assert.equal(r.aptoMovil, true)
    assert.equal(r.etapaActualIdx, -1)
})

test('notaFinal es el promedio simple de las 3 notas de etapa, redondeado a 1 decimal', () => {
    const resumenRetos = Object.fromEntries(RETOS.map(x => [x.id, { nota: 7, exito: true }]))
    const progreso = { web_aprobado_at: '2026-01-01', nota_web: 7 }
    const r = calcularRecorrido({ estadoAcademia: ACADEMIA_APROBADA, progreso, resumenRetos, retos: RETOS })
    assert.equal(r.notaFinal, 7.6)
})

test('nunca falla ni devuelve etapas vacías, aun sin argumentos', () => {
    const r = calcularRecorrido()
    assert.equal(r.etapas.length, 3)
    assert.equal(r.pctGeneral, 0)
    assert.equal(r.aptoMovil, false)
})
