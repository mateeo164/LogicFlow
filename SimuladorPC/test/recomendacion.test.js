import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recomendarSiguiente, UMBRAL_COMPRENSION } from '../js/recomendacion.js'

// Componentes de ejemplo (subconjunto ordenado como en el panel).
const COMPS = [
    { id: 'case', label: 'Gabinete' },
    { id: 'mb', label: 'Placa base' },
    { id: 'cpu', label: 'Procesador' },
    { id: 'ram', label: 'Memoria RAM' }
]

const RETOS = [
    { id: 'r-facil', titulo: 'Reto fácil', dificultad: 1 },
    { id: 'r-medio', titulo: 'Reto medio', dificultad: 2 },
    { id: 'r-dificil', titulo: 'Reto difícil', dificultad: 3 }
]

test('estudiante nuevo (sin nada) → empezar por la teoría', () => {
    const r = recomendarSiguiente({ progreso: {}, retos: RETOS, componentes: COMPS })
    assert.equal(r.id, 'empezar-teoria')
    assert.equal(r.accion.href, 'academia.html')
})

test('ensamble a medias → continuar en el laboratorio y nombrar la pieza siguiente', () => {
    const r = recomendarSiguiente({
        progreso: { componentes_instalados: ['case', 'mb'] },
        retos: RETOS, componentes: COMPS
    })
    assert.equal(r.id, 'continuar-ensamble')
    assert.equal(r.accion.href, 'juego.html')
    assert.match(r.razon, /2 de 4/)
    assert.match(r.razon, /Procesador/)   // el siguiente no instalado
})

test('aprobó el ensamble pero comprensión baja → reforzar teoría', () => {
    const r = recomendarSiguiente({
        progreso: { web_aprobado_at: '2026-01-01', comprension_pct: 50 },
        resumenRetos: {}, retos: RETOS, componentes: COMPS
    })
    assert.equal(r.id, 'reforzar-teoria')
    assert.equal(r.accion.href, 'academia.html')
    assert.match(r.razon, /50%/)
})

test('el umbral de comprensión es un límite exacto (justo en el umbral NO se refuerza)', () => {
    const base = { web_aprobado_at: '2026-01-01', comprension_pct: UMBRAL_COMPRENSION }
    const r = recomendarSiguiente({ progreso: base, resumenRetos: {}, retos: RETOS, componentes: COMPS })
    assert.notEqual(r.id, 'reforzar-teoria')   // 70% ya es suficiente
})

test('aprobó y entendió, con retos pendientes → sugiere el reto MÁS FÁCIL sin superar', () => {
    const r = recomendarSiguiente({
        progreso: { web_aprobado_at: '2026-01-01', comprension_pct: 90 },
        resumenRetos: { 'r-facil': { exito: true } },   // el fácil ya está
        retos: RETOS, componentes: COMPS
    })
    assert.equal(r.id, 'hacer-reto')
    assert.equal(r.accion.href, 'juego.html?reto=r-medio')  // el más fácil de los pendientes
    assert.match(r.razon, /2 retos/)
})

test('comprensión desconocida (null) no bloquea: pasa a los retos', () => {
    const r = recomendarSiguiente({
        progreso: { web_aprobado_at: '2026-01-01', comprension_pct: null },
        resumenRetos: {}, retos: RETOS, componentes: COMPS
    })
    assert.equal(r.id, 'hacer-reto')
})

test('web completo y todos los retos superados, falta móvil → app móvil', () => {
    const r = recomendarSiguiente({
        progreso: { web_aprobado_at: '2026-01-01', comprension_pct: 90 },
        resumenRetos: { 'r-facil': { exito: true }, 'r-medio': { exito: true }, 'r-dificil': { exito: true } },
        retos: RETOS, componentes: COMPS
    })
    assert.equal(r.id, 'app-movil')
    assert.equal(r.accion.href, null)
})

test('todo completo (web + móvil) → certificado', () => {
    const r = recomendarSiguiente({
        progreso: { web_aprobado_at: '2026-01-01', movil_completado_at: '2026-01-02', comprension_pct: 90 },
        resumenRetos: { 'r-facil': { exito: true }, 'r-medio': { exito: true }, 'r-dificil': { exito: true } },
        retos: RETOS, componentes: COMPS
    })
    assert.equal(r.id, 'certificado')
})

test('nunca falla ni devuelve vacío, aun sin argumentos', () => {
    const r = recomendarSiguiente()
    assert.ok(r && r.titulo && r.razon && r.accion)
})
