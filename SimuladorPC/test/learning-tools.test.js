import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    CPU_WATTAGE,
    GPU_WATTAGE,
    BASE_WATTAGE,
    calculateWattage,
    estimarCostoMensual,
    getEfficiencyRating,
    GLOSARIO,
    filterGlosario
} from '../js/learning-tools.js'

test('calculateWattage suma correctamente una configuración conocida', () => {
    const r = calculateWattage({
        cpuId: 'cpu-intel-i5', gpuId: 'gpu-rtx4070',
        ramSticks: 2, ssds: 1, hdds: 0, fans: 3, rgb: true
    })
    assert.equal(r.total, 417)
})

test('la fuente recomendada es un múltiplo de 50 con ~20% de headroom', () => {
    const r = calculateWattage({ cpuId: 'cpu-intel-i5', gpuId: 'gpu-rtx4070' })
    assert.equal(r.recommended % 50, 0)
    assert.ok(r.recommended >= r.total * 1.2, 'debe cubrir al menos el consumo + 20%')
    assert.equal(r.headroom, r.recommended - r.total)
    assert.ok(r.headroom >= 0, 'el headroom nunca es negativo')
})

test('un id de CPU/GPU desconocido cae al valor por defecto sin romper', () => {
    const r = calculateWattage({ cpuId: 'no-existe', gpuId: 'tampoco' })
    assert.equal(r.total, 65 + 0 + BASE_WATTAGE.motherboard + 2 * 5 + 7 + 3 * 5 + 10)
    assert.ok(Number.isFinite(r.recommended))
})

test('una fuente menos eficiente toma más energía de la pared', () => {
    const { efficiency } = calculateWattage({ cpuId: 'cpu-amd-ryzen7', gpuId: 'gpu-rtx4080' })
    assert.ok(efficiency.bronze.pared > efficiency.gold.pared)
    assert.ok(efficiency.gold.pared > efficiency.platinum.pared)
    assert.ok(efficiency.bronze.perdida > efficiency.platinum.perdida)
})

test('la potencia desde la pared siempre supera al consumo DC', () => {
    const { total, efficiency } = calculateWattage({ cpuId: 'cpu-intel-i9', gpuId: 'gpu-rtx4090' })
    for (const cert of ['bronze', 'silver', 'gold', 'platinum']) {
        assert.ok(efficiency[cert].pared >= total, `${cert}: la pared debe entregar >= consumo`)
        assert.equal(efficiency[cert].perdida, efficiency[cert].pared - total)
    }
})

test('más componentes nunca reducen el consumo total', () => {
    const base = calculateWattage({ cpuId: 'cpu-amd-ryzen5', gpuId: 'gpu-rtx3060', hdds: 0, fans: 0 })
    const cargado = calculateWattage({ cpuId: 'cpu-amd-ryzen5', gpuId: 'gpu-rtx3060', hdds: 4, fans: 6 })
    assert.ok(cargado.total > base.total)
})

test('estimarCostoMensual calcula kWh y costo a partir de la potencia de pared', () => {
    const c = estimarCostoMensual(500)
    assert.equal(c.kwhMes, 60)
    assert.equal(c.costo, 6)
    assert.equal(c.horasDia, 4)
    assert.equal(c.precioKwh, 0.10)
})

test('el costo escala linealmente con horas de uso y precio del kWh', () => {
    const barato = estimarCostoMensual(500, 4, 0.10)
    const caro = estimarCostoMensual(500, 8, 0.20)
    assert.ok(Math.abs(caro.costo - barato.costo * 4) < 0.01)
})

test('getEfficiencyRating clasifica por rango de vatios recomendados', () => {
    assert.equal(getEfficiencyRating(400).label, 'Bronze 80 Plus')
    assert.equal(getEfficiencyRating(450).label, 'Bronze 80 Plus')
    assert.equal(getEfficiencyRating(550).label, 'Gold 80 Plus')
    assert.equal(getEfficiencyRating(650).label, 'Gold 80 Plus')
    assert.equal(getEfficiencyRating(750).label, 'Platinum 80 Plus')
})

test('cada certificación trae un color asociado', () => {
    for (const w of [300, 500, 900]) {
        assert.match(getEfficiencyRating(w).color, /^#[0-9a-f]{6}$/i)
    }
})

test('todos los CPU y GPU del catálogo tienen TDP numérico positivo', () => {
    for (const [id, cpu] of Object.entries(CPU_WATTAGE)) {
        assert.ok(Number.isFinite(cpu.tdp) && cpu.tdp > 0, `${id} sin TDP válido`)
        assert.ok(cpu.name && cpu.socket, `${id} debe tener nombre y socket`)
    }
    for (const [id, gpu] of Object.entries(GPU_WATTAGE)) {
        assert.ok(Number.isFinite(gpu.tdp) && gpu.tdp > 0, `${id} sin TDP válido`)
    }
})

test('filterGlosario sin consulta devuelve el glosario completo', () => {
    assert.equal(filterGlosario('').length, GLOSARIO.length)
    assert.equal(filterGlosario('   ').length, GLOSARIO.length)
})

test('filterGlosario busca en término, título, descripción y tags, sin distinguir mayúsculas', () => {
    assert.ok(filterGlosario('CPU').some(x => x.term === 'CPU'))
    assert.ok(filterGlosario('nvme').some(x => x.term === 'NVMe'))
    assert.ok(filterGlosario('cerebro').some(x => x.term === 'CPU'))
    assert.ok(filterGlosario('almacenamiento').length >= 2)
})

test('filterGlosario devuelve vacío cuando nada coincide', () => {
    assert.equal(filterGlosario('xyzzy-no-existe').length, 0)
})

test('cada entrada del glosario está bien formada', () => {
    for (const item of GLOSARIO) {
        assert.ok(item.term && item.title && item.description, `${item.term} incompleto`)
        assert.ok(Array.isArray(item.tags) && item.tags.length > 0, `${item.term} sin tags`)
    }
})
