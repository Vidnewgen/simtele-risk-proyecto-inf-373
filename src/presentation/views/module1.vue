<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { browserHistoryRepository } from '../../application/persistence/local-history'
import { module1Detention, type ScenarioParameters } from '../../domain/models/four-module-models'
import NumericalChart, { type ChartSeries } from '../components/NumericalChart.vue'

const router = useRouter()
const selected = ref<'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO'>('NORMAL')

const scenario = computed<ScenarioParameters>(() => ({
  name: selected.value,
  description: 'Caso sintético reproducible para análisis académico.',
  equation: "x' = v, v' = -a",
}))

const result = computed(() => module1Detention(scenario.value))

const metrics = computed(() => {
  const value = result.value
  const analyticalTime = value.parameters.v0 / value.parameters.acceleration
  return [
    { label: 'Raíz válida', value: value.stoppingTime.toFixed(6), unit: 's' },
    { label: 'Referencia analítica', value: analyticalTime.toFixed(6), unit: 's' },
    { label: 'Error absoluto', value: Math.abs(value.stoppingTime - analyticalTime).toExponential(3), unit: 's' },
    { label: 'Bisecciones', value: `${value.iterations}`, unit: 'iteraciones' },
  ]
})

const tableRows = computed(() => {
  const value = result.value
  const analyticalTime = value.parameters.v0 / value.parameters.acceleration
  return [
    { metric: 'Tiempo de detención', value: `${value.stoppingTime.toFixed(6)} s`, reference: `${analyticalTime.toFixed(6)} s`, error: `${Math.abs(value.stoppingTime - analyticalTime).toExponential(3)} s` },
    { metric: 'Distancia recorrida', value: `${value.stoppingDistance.toFixed(6)} m`, reference: `${value.referenceDistance.toFixed(6)} m`, error: `${value.distanceError.toExponential(3)} m` },
    { metric: 'Iteraciones de raíz', value: `${value.iterations}`, reference: 'Tolerancia 10⁻⁸', error: 'Bisección' },
  ]
})

const chartSeries = computed(() => {
  const value = result.value
  const sampleCount = 25
  const times = Array.from({ length: sampleCount }, (_, index) =>
    value.stoppingTime * index / (sampleCount - 1),
  )
  return [
    { name: 'Velocidad', values: times.map(time => value.parameters.v0 - value.parameters.acceleration * time), color: '#2563eb' },
    { name: 'Cero físico', values: times.map(() => 0), color: '#ef4444', dashed: true },
  ] as ChartSeries[]
})

const problemConclusion = computed(() =>
  selected.value === 'MAL_CONDICIONADO'
    ? 'La desaceleración baja prolonga el frenado y reduce la derivada efectiva del modelo, por lo que aumenta la sensibilidad del tiempo de detención.'
    : selected.value === 'ESTRES'
      ? 'La exigencia presenta mayor velocidad inicial y desaceleración sintética; conviene comparar el tiempo y la distancia con el caso normal.'
      : 'El escenario normal proporciona una referencia lineal reproducible para detención, distancia y sensibilidad.',
)

watch(selected, (scenario) => {
  browserHistoryRepository().save({
    moduleId: 1,
    scenario,
    summary: `Detención: ${result.value.stoppingTime.toFixed(6)} s`,
  })
}, { immediate: true })
</script>

<template>
  <main class="container">
    <button class="back" @click="router.push('/')">← Volver</button>
    <h2>Módulo 1: Detención de Emergencia</h2>

    <div class="tabs">
      <button :class="{ active: selected === 'NORMAL' }" @click="selected = 'NORMAL'">NORMAL</button>
      <button :class="{ active: selected === 'ESTRES' }" @click="selected = 'ESTRES'">ESTRÉS</button>
      <button :class="{ active: selected === 'MAL_CONDICIONADO' }" @click="selected = 'MAL_CONDICIONADO'">MAL CONDICIONADO</button>
    </div>

    <div class="box">
      <h3>Detención de emergencia</h3>
      <p>Análisis sintético del tiempo y la distancia de frenado de una cabina.</p>
      <p><strong>Modelo:</strong> {{ scenario.equation }} | <strong>Escenario:</strong> {{ selected }}</p>
    </div>

    <div class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.unit }}</small>
      </article>
    </div>

    <NumericalChart
      title="Velocidad durante la detención"
      subtitle="Solución analítica v(t) = v₀ - at"
      x-label="Tiempo (s)"
      y-label="Velocidad (m/s)"
      :x-end="result.stoppingTime"
      :threshold-x="result.stoppingTime"
      :threshold-label="`Detención ${result.stoppingTime.toFixed(2)} s`"
      :series="chartSeries"
    />

    <table>
      <thead><tr><th>Métrica</th><th>Resultado calculado</th><th>Referencia</th><th>Error / detalle</th></tr></thead>
      <tbody>
        <tr v-for="row in tableRows" :key="row.metric">
          <td><strong>{{ row.metric }}</strong></td><td>{{ row.value }}</td><td>{{ row.reference }}</td><td>{{ row.error }}</td>
        </tr>
      </tbody>
    </table>

    <div class="conclusions">
      <div class="box"><h4>Conclusión Numérica</h4><p>La distancia integrada fue {{ result.stoppingDistance.toFixed(6) }} m frente a {{ result.referenceDistance.toFixed(6) }} m analíticos, con {{ result.iterations }} bisecciones.</p></div>
      <div class="box"><h4>Conclusión del Fenómeno</h4><p>{{ problemConclusion }}</p></div>
    </div>
  </main>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif; color: #1e293b; }
.back { margin-bottom: 1.5rem; padding: 0.5rem 0.8rem; border: 1px solid #cbd5e1; background: transparent; cursor: pointer; }
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.tabs button { border: 1px solid #cbd5e1; background: white; border-radius: 999px; padding: 0.55rem 0.9rem; cursor: pointer; font-weight: 700; }
.tabs button.active { background: #0f172a; color: white; border-color: #0f172a; }
.box { border: 1px solid #dbe3ef; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; background: white; }
.box h3, .box h4 { margin-top: 0; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem; }
.metric-card { display: flex; flex-direction: column; min-height: 96px; justify-content: center; border: 1px solid #dbe3ef; border-left: 4px solid #2563eb; border-radius: 10px; padding: 0.85rem 1rem; background: #fff; }
.metric-card span, .metric-card small { color: #64748b; }
.metric-card strong { margin: 0.28rem 0; color: #0f172a; }
table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
th, td { border: 1px solid #cbd5e1; padding: 0.6rem; text-align: left; }
th { background: #f1f5f9; }
.conclusions { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
@media (max-width: 820px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .conclusions { grid-template-columns: 1fr; } }
</style>
