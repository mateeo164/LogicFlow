import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    getLevel,
    getNextLevel,
    getXpToNextLevel,
    calculateTotalXp,
    getBadges,
    bonoPorLogros,
    notaConBono,
    LOGRO_BONO_MAX
} from '../js/achievements.js'

test('getLevel devuelve el nivel correcto según XP', () => {
    assert.equal(getLevel(0).name, 'Novato')
    assert.equal(getLevel(100).name, 'Aprendiz')
    assert.equal(getLevel(299).name, 'Aprendiz')
    assert.equal(getLevel(300).name, 'Técnico')
    assert.equal(getLevel(5000).name, 'Master Builder')
})

test('getNextLevel es null en el nivel máximo', () => {
    assert.equal(getNextLevel(0).name, 'Aprendiz')
    assert.equal(getNextLevel(9999), null)
})

test('getXpToNextLevel calcula lo que falta', () => {
    const info = getXpToNextLevel(50)
    assert.equal(info.remaining, 50) // faltan 50 para llegar a 100
    assert.equal(getXpToNextLevel(9999).remaining, 0)
})

test('calculateTotalXp suma componentes y simulaciones', () => {
    const progreso = { componentes_instalados: ['case', 'mb', 'cpu'], simulaciones_completadas: 1 }
    const stats = { aciertos: 3, errores_pieza: 0, tiempo_promedio: 60 }
    // 3*100 + 1*200 + PERFECT_RUN(100 por 0 errores) = 600
    assert.equal(calculateTotalXp(progreso, stats), 600)
})

test('un run sin errores otorga la insignia "Mano firme"', () => {
    const progreso = { simulaciones_completadas: 1, componentes_instalados: [] }
    const stats = { aciertos: 8, errores_pieza: 0 }
    const badges = getBadges(progreso, stats, calculateTotalXp(progreso, stats))
    const manoFirme = badges.find(b => b.id === 'sin_errores')
    assert.ok(manoFirme.unlocked)
})

test('el bono por logros está acotado', () => {
    assert.equal(bonoPorLogros(0), 0)
    assert.ok(Math.abs(bonoPorLogros(3) - 0.15) < 1e-9)
    assert.equal(bonoPorLogros(999), LOGRO_BONO_MAX) // nunca supera el máximo
})

test('notaConBono nunca pasa de 10', () => {
    assert.equal(notaConBono(9.9, 10), 10)
    assert.equal(notaConBono(7, 2), 7.1)
})
