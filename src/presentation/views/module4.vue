<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { browserHistoryRepository } from '../../application/persistence/local-history'
import { module4Sensors, type ScenarioParameters } from '../../domain/models/four-module-models'
import NumericalChart, { type ChartSeries } from '../components/NumericalChart.vue'

const router = useRouter()
const selected = ref<'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO'>('NORMAL')
const scenario = computed<ScenarioParameters>(() => ({
  name: selected.value,
  description: 'Caso sintético reproducible para reconstrucción de telemetría.',
  equation: 'p(t) interpolada con Lagrange',
}))
const result = computed(() => module4Sensors(scenario.value))
const metrics = computed(() => [
  { label: 'Puntos ocultos', value: `${result.value.testPoints.length}`, unit: 'puntos' },
  { label: 'Referencia sin(t)', value: 'Analítica', unit: 'puntos reales' },
  { label: 'Error medio absoluto', value: result.value.meanAbsoluteError.toExponential(3), unit: 'señal' },
  { label: 'Pasos / nodos', value: `${result.value.parameters.step} / ${result.value.nodes.length}`, unit: 'muestra' },
])
const chartSeries = computed(() => [
  { name: 'Lagrange', values: result.value.recovered, color: '#2563eb' },
  { name: 'Referencia', values: result.value.reference, color: '#16a34a', dashed: true },
] as ChartSeries[])
const tableRows = computed(() => result.value.testPoints.map((point, index) => ({
  metric: `Punto oculto ${index + 1} (t=${point.toFixed(3)})`,
  value: result.value.recovered[index]?.toFixed(8) ?? '0',
  reference: result.value.reference[index]?.toFixed(8) ?? '0',
  error: `${Math.abs((result.value.recovered[index] ?? 0) - (result.value.reference[index] ?? 0)).toExponential(3)}`,
})))
watch(selected, (scenario) => {
  browserHistoryRepository().save({ moduleId: 4, scenario, summary: `Error medio: ${result.value.meanAbsoluteError.toExponential(3)}` })
}, { immediate: true })
</script>

<template>
  <main class="container">
    <button class="back" @click="router.push('/')">← Volver</button>
    <h2>Módulo 4: Reconstrucción de Sensores</h2>
    <div class="tabs"><button :class="{ active: selected === 'NORMAL' }" @click="selected = 'NORMAL'">NORMAL</button><button :class="{ active: selected === 'ESTRES' }" @click="selected = 'ESTRES'">ESTRÉS</button><button :class="{ active: selected === 'MAL_CONDICIONADO' }" @click="selected = 'MAL_CONDICIONADO'">MAL CONDICIONADO</button></div>
    <div class="box"><h3>Reconstrucción de telemetría</h3><p>Recuperación sintética de datos mediante puntos ocultos.</p><p><strong>Modelo:</strong> {{ scenario.equation }} | <strong>Escenario:</strong> {{ selected }}</p></div>
    <div class="metric-grid"><article v-for="metric in metrics" :key="metric.label" class="metric-card"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.unit }}</small></article></div>
    <NumericalChart title="Reconstrucción de telemetría" subtitle="Interpolación frente a la función de referencia" x-label="Tiempo (s)" y-label="Señal sintética" :x-end="result.testPoints.at(-1) ?? 1" :series="chartSeries" />
    <table><thead><tr><th>Métrica</th><th>Resultado calculado</th><th>Referencia</th><th>Error / detalle</th></tr></thead><tbody><tr v-for="row in tableRows" :key="row.metric"><td><strong>{{ row.metric }}</strong></td><td>{{ row.value }}</td><td>{{ row.reference }}</td><td>{{ row.error }}</td></tr></tbody></table>
    <div class="conclusions"><div class="box"><h4>Conclusión Numérica</h4><p>Lagrange recuperó {{ result.testPoints.length }} puntos ocultos con error medio absoluto de {{ result.meanAbsoluteError.toExponential(3) }}.</p></div><div class="box"><h4>Conclusión del Fenómeno</h4><p>{{ selected === 'MAL_CONDICIONADO' ? 'Los nodos espaciados y el ruido sintético aumentan la sensibilidad.' : 'El escenario permite evaluar nodos, estabilidad y precisión.' }}</p></div></div>
  </main>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif; color: #1e293b; }.back { margin-bottom: 1.5rem; }.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }.tabs button { border: 1px solid #cbd5e1; background: white; border-radius: 999px; padding: 0.55rem 0.9rem; font-weight: 700; }.tabs button.active { background: #0f172a; color: white; }.box { border: 1px solid #dbe3ef; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; }.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem; }.metric-card { display: flex; flex-direction: column; min-height: 96px; justify-content: center; border: 1px solid #dbe3ef; border-left: 4px solid #2563eb; border-radius: 10px; padding: 0.85rem 1rem; }.metric-card span,.metric-card small { color: #64748b; }.metric-card strong { margin: 0.28rem 0; }table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }th,td { border: 1px solid #cbd5e1; padding: 0.6rem; text-align: left; }th { background: #f1f5f9; }.conclusions { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }@media (max-width: 820px) {.metric-grid,.conclusions { grid-template-columns: repeat(2, minmax(0, 1fr)); }}
</style>
