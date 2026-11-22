<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { browserHistoryRepository } from '../../application/persistence/local-history'
import { module3Wind, type ScenarioParameters } from '../../domain/models/four-module-models'
import NumericalChart, { type ChartSeries } from '../components/NumericalChart.vue'

const router = useRouter()
const selected = ref<'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO'>('NORMAL')
const scenario = computed<ScenarioParameters>(() => ({
  name: selected.value,
  description: 'Caso sintético reproducible para vibración lateral.',
  equation: "x' = v, v' = (F - cv - kx)/m",
}))
const result = computed(() => module3Wind(scenario.value))

const metrics = computed(() => [
  { label: 'Desplazamiento máximo', value: result.value.maximumDisplacement.toFixed(6), unit: 'm' },
  { label: 'Referencia libre', value: 'RK4 0.01 s', unit: 'paso' },
  { label: 'Proxy de energía', value: result.value.energyProxy.toFixed(6), unit: '∫x²dt' },
  { label: 'Pasos ejecutados', value: `${result.value.points.length - 1}`, unit: 'pasos RK4' },
])

const chartSeries = computed(() => {
  const sampled = result.value.points.filter((_, index) => index % 20 === 0 || index === result.value.points.length - 1)
  return [
    { name: 'x(t)', values: sampled.map(row => row[2] ?? 0), color: '#2563eb' },
    { name: 'Movimiento abs.', values: sampled.map(row => Math.abs(row[2] ?? 0)), color: '#f97316', dashed: true },
  ] as ChartSeries[]
})

const tableRows = computed(() => [
  { metric: 'Desplazamiento máximo', value: `${result.value.maximumDisplacement.toFixed(6)} m`, reference: 'Integral RK4', error: `${result.value.points.length - 1} pasos` },
  { metric: 'Proxy de energía', value: result.value.energyProxy.toFixed(6), reference: '∫ |x|² dt', error: 'Trapecio compuesto' },
  { metric: 'Amortiguamiento', value: `${result.value.parameters.damping}`, reference: 'Parámetro sintético', error: selected.value },
])

watch(selected, (scenario) => {
  browserHistoryRepository().save({ moduleId: 3, scenario, summary: `Desplazamiento máximo: ${result.value.maximumDisplacement.toFixed(6)} m` })
}, { immediate: true })
</script>

<template>
  <main class="container">
    <button class="back" @click="router.push('/')">← Volver</button>
    <h2>Módulo 3: Oscilaciones por Viento</h2>
    <div class="tabs">
      <button :class="{ active: selected === 'NORMAL' }" @click="selected = 'NORMAL'">NORMAL</button>
      <button :class="{ active: selected === 'ESTRES' }" @click="selected = 'ESTRES'">ESTRÉS</button>
      <button :class="{ active: selected === 'MAL_CONDICIONADO' }" @click="selected = 'MAL_CONDICIONADO'">MAL CONDICIONADO</button>
    </div>
    <div class="box"><h3>Respuesta dinámica lateral</h3><p>Vibración sintética ante fuerza lateral periódica.</p><p><strong>Modelo:</strong> {{ scenario.equation }} | <strong>Escenario:</strong> {{ selected }}</p></div>
    <div class="metric-grid"><article v-for="metric in metrics" :key="metric.label" class="metric-card"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.unit }}</small></article></div>
    <NumericalChart title="Respuesta dinámica lateral" subtitle="Desplazamiento calculado con RK4" x-label="Tiempo (s)" y-label="Desplazamiento (m)" :x-end="20" :series="chartSeries" />
    <table><thead><tr><th>Métrica</th><th>Resultado calculado</th><th>Referencia</th><th>Error / detalle</th></tr></thead><tbody><tr v-for="row in tableRows" :key="row.metric"><td><strong>{{ row.metric }}</strong></td><td>{{ row.value }}</td><td>{{ row.reference }}</td><td>{{ row.error }}</td></tr></tbody></table>
    <div class="conclusions"><div class="box"><h4>Conclusión Numérica</h4><p>RK4 ejecutó {{ result.points.length - 1 }} pasos y obtuvo desplazamiento máximo de {{ result.maximumDisplacement.toFixed(6) }} m.</p></div><div class="box"><h4>Conclusión del Fenómeno</h4><p>{{ selected === 'MAL_CONDICIONADO' ? 'El bajo amortiguamiento prolonga la respuesta y demuestra sensibilidad dinámica sin representar riesgo físico real.' : 'El escenario conserva interpretación sintética y permite comparar amortiguamiento y respuesta.' }}</p></div></div>
  </main>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif; color: #1e293b; }.back { margin-bottom: 1.5rem; }.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }.tabs button { border: 1px solid #cbd5e1; background: white; border-radius: 999px; padding: 0.55rem 0.9rem; font-weight: 700; }.tabs button.active { background: #0f172a; color: white; }.box { border: 1px solid #dbe3ef; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; }.box h3,.box h4 { margin-top: 0; }.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem; }.metric-card { display: flex; flex-direction: column; min-height: 96px; justify-content: center; border: 1px solid #dbe3ef; border-left: 4px solid #2563eb; border-radius: 10px; padding: 0.85rem 1rem; }.metric-card span,.metric-card small { color: #64748b; }.metric-card strong { margin: 0.28rem 0; }table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }th,td { border: 1px solid #cbd5e1; padding: 0.6rem; text-align: left; }th { background: #f1f5f9; }.conclusions { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }@media (max-width: 820px) {.metric-grid,.conclusions { grid-template-columns: repeat(2, minmax(0, 1fr)); }}@media (max-width: 600px) {.metric-grid,.conclusions { grid-template-columns: 1fr; }}
</style>
