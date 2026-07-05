import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    PREGUNTAS_COMPONENTE,
    EVALUACION,
    notaConceptual,
    combinarNota,
    gananciaAprendizaje,
    PESO_CONCEPTUAL
} from '../js/quiz-data.js'

test('cada componente del laboratorio tiene su pregunta bien formada', () => {
    const ids = ['case', 'mb', 'cpu', 'cooler', 'ram', 'storage', 'gpu', 'power']
    for (const id of ids) {
        const q = PREGUNTAS_COMPONENTE[id]
        assert.ok(q, `falta pregunta para ${id}`)
        assert.ok(q.opciones.length >= 3, `${id} debe tener al menos 3 opciones`)
        assert.ok(q.correcta >= 0 && q.correcta < q.opciones.length, `${id} índice correcto fuera de rango`)
        assert.ok(q.explica && q.explica.length > 20, `${id} debe explicar el porqué`)
    }
})

test('el pre/post-test tiene preguntas válidas', () => {
    assert.ok(EVALUACION.length >= 5)
    for (const q of EVALUACION) {
        assert.ok(q.correcta >= 0 && q.correcta < q.opciones.length)
    }
})

test('notaConceptual escala 0..10 según aciertos', () => {
    assert.equal(notaConceptual(0, 8), 0)
    assert.equal(notaConceptual(8, 8), 10)
    assert.equal(notaConceptual(4, 8), 5)
    assert.equal(notaConceptual(0, 0), 0)        // sin preguntas → 0, no NaN
    assert.equal(notaConceptual(99, 8), 10)      // acota arriba
})

test('combinarNota mezcla destreza y comprensión con el peso definido', () => {
    // destreza 10, comprensión 0 → 10*(1-0.4) = 6
    assert.equal(combinarNota(10, 0), 10 * (1 - PESO_CONCEPTUAL))
    // ambas 10 → 10
    assert.equal(combinarNota(10, 10), 10)
    // ambas 0 → 0
    assert.equal(combinarNota(0, 0), 0)
    // acota al rango 0..10
    assert.ok(combinarNota(10, 10, 2) <= 10)
})

test('un ensamble perfecto pero sin entender NO saca 10', () => {
    // destreza perfecta (10) pero 0 preguntas acertadas de 8
    const nota = combinarNota(10, notaConceptual(0, 8))
    assert.ok(nota < 10, 'la comprensión debe pesar en la nota')
    assert.equal(nota, 6) // 10*0.6 + 0*0.4
})

test('gananciaAprendizaje mide la mejora entre pre y post-test', () => {
    // de 2/6 a 5/6: recuperó parte del margen
    const g = gananciaAprendizaje(2, 5, 6)
    assert.ok(g > 0 && g <= 1)
    // sin cambio → 0
    assert.equal(gananciaAprendizaje(3, 3, 6), 0)
    // pre perfecto y sigue perfecto → 1
    assert.equal(gananciaAprendizaje(6, 6, 6), 1)
    // total 0 → 0, no NaN
    assert.equal(gananciaAprendizaje(0, 0, 0), 0)
})
