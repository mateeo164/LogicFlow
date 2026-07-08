import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    RETOS,
    LOGROS_RETO,
    NOTA_MINIMA_RETO,
    calcularNotaReto,
    obtenerReto
} from '../js/retos-data.js'

// Los 8 componentes que el estudiante puede inspeccionar en cada reto.
const COMPONENTES = ['case', 'mb', 'cpu', 'cooler', 'ram', 'storage', 'gpu', 'power']

// --- calcularNotaReto: la fórmula que califica una reparación ---

test('calcularNotaReto: diagnóstico impecable saca 10', () => {
    assert.equal(calcularNotaReto({ erroresDiagnostico: 0, pistasUsadas: 0, segundos: 60 }), 10)
    assert.equal(calcularNotaReto({}), 10) // sin datos → 10 (valores por defecto)
})

test('calcularNotaReto: cada error de diagnóstico penaliza 2 puntos', () => {
    assert.equal(calcularNotaReto({ erroresDiagnostico: 1 }), 8)
    assert.equal(calcularNotaReto({ erroresDiagnostico: 2 }), 6)
})

test('calcularNotaReto: cada pista usada penaliza 1 punto', () => {
    assert.equal(calcularNotaReto({ pistasUsadas: 1 }), 9)
    assert.equal(calcularNotaReto({ pistasUsadas: 3 }), 7)
})

test('calcularNotaReto: pasar de 6 minutos penaliza 1 punto (y el límite es exacto)', () => {
    assert.equal(calcularNotaReto({ segundos: 360 }), 10) // 360 justo NO penaliza
    assert.equal(calcularNotaReto({ segundos: 361 }), 9)  // pasarse sí
})

test('calcularNotaReto: penalizaciones combinadas', () => {
    // 10 − (2 errores × 2) − (1 pista × 1) − (lento) = 10 − 4 − 1 − 1 = 4
    assert.equal(calcularNotaReto({ erroresDiagnostico: 2, pistasUsadas: 1, segundos: 400 }), 4)
})

test('calcularNotaReto: nunca baja de 0', () => {
    assert.equal(calcularNotaReto({ erroresDiagnostico: 99, pistasUsadas: 99, segundos: 9999 }), 0)
})

// --- LOGROS_RETO: cada logro se dispara con el resultado correcto ---

const logro = (id) => LOGROS_RETO.find(l => l.id === id)

test('primer_diagnostico requiere al menos un reto superado', () => {
    assert.equal(logro('primer_diagnostico').condition([{ exito: false }]), false)
    assert.equal(logro('primer_diagnostico').condition([{ exito: true }]), true)
})

test('ojo_clinico requiere éxito sin errores de diagnóstico', () => {
    const c = logro('ojo_clinico').condition
    assert.equal(c([{ exito: true, errores_diagnostico: 1 }]), false)
    assert.equal(c([{ exito: true, errores_diagnostico: 0 }]), true)
    assert.equal(c([{ exito: false, errores_diagnostico: 0 }]), false) // sin éxito no cuenta
})

test('sin_ayuda requiere éxito sin usar pistas', () => {
    const c = logro('sin_ayuda').condition
    assert.equal(c([{ exito: true, pistas_usadas: 2 }]), false)
    assert.equal(c([{ exito: true, pistas_usadas: 0 }]), true)
})

test('contrarreloj requiere reparar en menos de 3 minutos', () => {
    const c = logro('contrarreloj').condition
    assert.equal(c([{ exito: true, segundos: 200 }]), false)
    assert.equal(c([{ exito: true, segundos: 179 }]), true)
    assert.equal(c([{ exito: true, segundos: 0 }]), false)   // 0s no es válido (guarda contra tiempos vacíos)
})

test('tecnico_de_taller requiere superar TODOS los retos', () => {
    const c = logro('tecnico_de_taller').condition
    const todos = RETOS.map(r => ({ exito: true, reto_id: r.id }))
    assert.equal(c(todos), true)
    assert.equal(c(todos.slice(0, RETOS.length - 1)), false) // falta uno → no
    // superar el mismo reto varias veces no basta
    assert.equal(c([{ exito: true, reto_id: RETOS[0].id }]), false)
})

test('nota_perfecta requiere un 10 en un reto', () => {
    const c = logro('nota_perfecta').condition
    assert.equal(c([{ exito: true, nota: 9 }]), false)
    assert.equal(c([{ exito: true, nota: 10 }]), true)
    assert.equal(c([{ exito: true, nota: '10' }]), true) // tolera nota como string (viene de la BD)
})

// --- obtenerReto ---

test('obtenerReto devuelve el reto por id, o null si no existe', () => {
    assert.equal(obtenerReto('no-enciende').id, 'no-enciende')
    assert.equal(obtenerReto('inexistente'), null)
})

// --- Integridad de los datos de los retos ---
// Un bug aquí (falla sin inspección anómala, o dos anómalas) haría imposible o
// ambiguo el diagnóstico y calificaría mal a un estudiante real.

test('cada reto tiene EXACTAMENTE una inspección anómala y coincide con componenteFalla', () => {
    for (const r of RETOS) {
        const anomalas = COMPONENTES.filter(c => r.inspecciones[c]?.anomalo)
        assert.equal(anomalas.length, 1, `${r.id}: debe haber exactamente 1 inspección anómala, hay ${anomalas.length}`)
        assert.equal(anomalas[0], r.componenteFalla, `${r.id}: la inspección anómala (${anomalas[0]}) no coincide con componenteFalla (${r.componenteFalla})`)
    }
})

test('cada reto ofrece inspección para los 8 componentes, con texto', () => {
    for (const r of RETOS) {
        for (const c of COMPONENTES) {
            const insp = r.inspecciones[c]
            assert.ok(insp, `${r.id}: falta la inspección de ${c}`)
            assert.ok(typeof insp.texto === 'string' && insp.texto.length > 0, `${r.id}: la inspección de ${c} no tiene texto`)
        }
    }
})

test('cada reto está bien formado (id, dificultad 1..3, síntomas, pistas, explicación)', () => {
    const vistos = new Set()
    for (const r of RETOS) {
        assert.ok(r.id && !vistos.has(r.id), `id duplicado o vacío: ${r.id}`)
        vistos.add(r.id)
        assert.ok(r.dificultad >= 1 && r.dificultad <= 3, `${r.id}: dificultad fuera de rango`)
        assert.ok(Array.isArray(r.sintomas) && r.sintomas.length > 0, `${r.id}: sin síntomas`)
        assert.ok(Array.isArray(r.pistas) && r.pistas.length > 0, `${r.id}: sin pistas`)
        assert.ok(r.cliente && r.explicacion && r.descripcionFalla, `${r.id}: faltan textos narrativos`)
        assert.ok(COMPONENTES.includes(r.componenteFalla), `${r.id}: componenteFalla desconocido`)
    }
})

test('el mínimo para aprobar un reto es razonable', () => {
    assert.ok(NOTA_MINIMA_RETO > 0 && NOTA_MINIMA_RETO <= 10)
})
