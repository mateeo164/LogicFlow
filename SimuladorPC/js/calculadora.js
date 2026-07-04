import { CPU_WATTAGE, GPU_WATTAGE, calculateWattage, getEfficiencyRating } from './learning-tools.js'

function populateSelect(selectId, optionsMap) {
  const select = document.getElementById(selectId)
  if (!select) return
  select.innerHTML = Object.entries(optionsMap).map(([id, item]) => {
    return `<option value="${id}">${item.name} — ${item.tdp} W</option>`
  }).join('')
}

function updateResult() {
  const cpuId = document.getElementById('cpu-select').value
  const gpuId = document.getElementById('gpu-select').value
  const ramSticks = parseInt(document.getElementById('ram-input').value, 10) || 0
  const ssds = parseInt(document.getElementById('ssd-input').value, 10) || 0
  const hdds = parseInt(document.getElementById('hdd-input').value, 10) || 0
  const fans = parseInt(document.getElementById('fan-input').value, 10) || 0
  const rgb = document.getElementById('rgb-input').checked

  const result = calculateWattage({ cpuId, gpuId, ramSticks, ssds, hdds, fans, rgb })
  const cert = getEfficiencyRating(result.recommended)

  document.getElementById('result-watts').textContent = result.recommended
  document.getElementById('result-total').textContent = `${result.total} W`
  document.getElementById('result-headroom').textContent = `${result.headroom} W`
  const certEl = document.getElementById('result-cert')
  certEl.textContent = cert.label
  certEl.style.color = cert.color

  document.getElementById('eff-bronze').textContent = `≈ ${result.efficiency.bronze} W desde la pared`
  document.getElementById('eff-silver').textContent = `≈ ${result.efficiency.silver} W desde la pared`
  document.getElementById('eff-gold').textContent = `≈ ${result.efficiency.gold} W desde la pared`
  document.getElementById('eff-platinum').textContent = `≈ ${result.efficiency.platinum} W desde la pared`
}

function init() {
  populateSelect('cpu-select', CPU_WATTAGE)
  populateSelect('gpu-select', GPU_WATTAGE)

  document.querySelectorAll('#psu-form input, #psu-form select').forEach(el => {
    el.addEventListener('input', updateResult)
    el.addEventListener('change', updateResult)
  })

  updateResult()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
