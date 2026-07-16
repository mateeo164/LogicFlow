import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    PREGUNTAS_COMPONENTE,
    EVALUACION,
    elegirAlAzar,
    muestraAlAzar,
    elegirPreguntaComponente,
    elegirEvaluacion,
    EVAL_POR_SESION,
    notaConceptual,
    notaDestreza,
    combinarNota,
    gananciaAprendizaje,
    PESO_CONCEPTUAL
} from '../js/quiz-data.js'

test('cada componente tiene un BANCO (varias preguntas) bien formado', () => {
    const ids = ['case', 'mb', 'cpu', 'cooler', 'ram', 'storage', 'gpu', 'power', 'fans', 'hdd', 'sata']
    for (const id of ids) {
        const banco = PREGUNTAS_COMPONENTE[id]
        assert.ok(Array.isArray(banco), `${id} debe ser un arreglo (banco)`)
        assert.ok(banco.length >= 2, `${id} debe tener al menos 2 preguntas para no repetir siempre la misma`)
        for (const q of banco) {
            assert.ok(q.pregunta && q.pregunta.length > 10, `${id}: pregunta vacía`)
            assert.ok(q.opciones.length >= 3, `${id} debe tener al menos 3 opciones`)
            assert.ok(q.correcta >= 0 && q.correcta < q.opciones.length, `${id}: índice correcto fuera de rango`)
            assert.ok(q.explica && q.explica.length > 20, `${id}: cada pregunta debe explicar el porqué`)
        }
    }
})

test('el banco pre/post-test tiene preguntas válidas y da margen para elegir', () => {
    assert.ok(EVALUACION.length >= EVAL_POR_SESION, 'el banco debe tener al menos las que se usan por sesión')
    for (const q of EVALUACION) {
        assert.ok(q.correcta >= 0 && q.correcta < q.opciones.length)
        assert.ok(q.pregunta && q.opciones.length >= 3)
    }
})

test('elegirAlAzar respeta el rng y acota los extremos', () => {
    const arr = ['a', 'b', 'c', 'd']
    assert.equal(elegirAlAzar(arr, () => 0), 'a')
    assert.equal(elegirAlAzar(arr, () => 0.99), 'd')
    assert.equal(elegirAlAzar(arr, () => 1), 'd')
    assert.equal(elegirAlAzar([], () => 0), null)
    assert.equal(elegirAlAzar(null), null)
})

test('elegirPreguntaComponente devuelve una pregunta real del banco de ese componente', () => {
    const q = elegirPreguntaComponente('cpu', () => 0)
    assert.ok(PREGUNTAS_COMPONENTE.cpu.includes(q))
    assert.equal(elegirPreguntaComponente('inexistente', () => 0), null)
})

test('muestraAlAzar devuelve n elementos DISTINTOS', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8]
    const m = muestraAlAzar(arr, 4, () => 0.5)
    assert.equal(m.length, 4)
    assert.equal(new Set(m).size, 4)
    m.forEach(x => assert.ok(arr.includes(x)))
})

test('muestraAlAzar nunca pide más de los que hay', () => {
    const m = muestraAlAzar([1, 2, 3], 10, () => 0.3)
    assert.equal(m.length, 3)
    assert.equal(new Set(m).size, 3)
})

test('elegirEvaluacion toma un subconjunto del tamaño de sesión, sin repetir', () => {
    const seleccion = elegirEvaluacion(EVAL_POR_SESION, () => 0.42)
    assert.equal(seleccion.length, EVAL_POR_SESION)
    assert.equal(new Set(seleccion).size, EVAL_POR_SESION)
    seleccion.forEach(q => assert.ok(EVALUACION.includes(q)))
})

test('notaConceptual escala 0..10 según aciertos', () => {
    assert.equal(notaConceptual(0, 8), 0)
    assert.equal(notaConceptual(8, 8), 10)
    assert.equal(notaConceptual(4, 8), 5)
    assert.equal(notaConceptual(0, 0), 0)
    assert.equal(notaConceptual(99, 8), 10)
})

test('notaDestreza parte de 10 y penaliza errores y demoras', () => {
    assert.equal(notaDestreza(0, 0), 10)
    assert.equal(notaDestreza(2, 0), 8)
    assert.equal(notaDestreza(0, 4), 8)
    assert.equal(notaDestreza(3, 2), 6)
    assert.equal(notaDestreza(20, 0), 0)
    assert.equal(notaDestreza(), 10)
})

test('combinarNota mezcla destreza y comprensión con el peso definido', () => {
    assert.equal(combinarNota(10, 0), 10 * (1 - PESO_CONCEPTUAL))
    assert.equal(combinarNota(10, 10), 10)
    assert.equal(combinarNota(0, 0), 0)
    assert.ok(combinarNota(10, 10, 2) <= 10)
})

test('un ensamble perfecto pero sin entender NO saca 10', () => {
    const nota = combinarNota(10, notaConceptual(0, 8))
    assert.ok(nota < 10, 'la comprensión debe pesar en la nota')
    assert.equal(nota, 6)
})

test('gananciaAprendizaje mide la mejora entre pre y post-test', () => {
    const g = gananciaAprendizaje(2, 5, 6)
    assert.ok(g > 0 && g <= 1)
    assert.equal(gananciaAprendizaje(3, 3, 6), 0)
    assert.equal(gananciaAprendizaje(6, 6, 6), 1)
    assert.equal(gananciaAprendizaje(0, 0, 0), 0)
})
