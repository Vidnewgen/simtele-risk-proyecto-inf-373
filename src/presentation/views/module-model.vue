<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { browserHistoryRepository } from '../../application/persistence/local-history'
import { module1Detention, module3Wind, module4Sensors, type ScenarioParameters } from '../../domain/models/four-module-models'
import NumericalChart, { type ChartSeries } from '../components/NumericalChart.vue'

const route = useRoute()
const router = useRouter()
const moduleId = computed(() => Number(route.params.moduleId))
const selected = ref<'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO'>('NORMAL')

const scenario = computed<ScenarioParameters>(() => ({
  name: selected.value,
  description: 'Caso sintético reproducible para análisis académico.',
  equation: moduleId.value === 1 ? "x' = v, v' = -a" : moduleId.value === 3 ? "x' = v, v' = (F - cv - kx)/m" : 'p(t) interpolada con Lagrange',
}))

const result = computed(() => {
  if (moduleId.value === 1) return module1Detention(scenario.value)
  if (moduleId.value === 3) return module3Wind(scenario.value)
  return module4Sensors(scenario.value)
})

const title = computed(() => moduleId.value === 1
  ? 'Detención de Emergencia'
  : moduleId.value === 3
    ? 'Oscilaciones por Viento'
    : 'Reconstrucción de Sensores')

const description = computed(() => moduleId.value === 1
  ? 'Análisis del tiempo y la distancia de frenado de una cabina ante desaceleración sintética constante.'
  : moduleId.value === 3
    ? 'Respuesta dinámica lateral ante una fuerza de viento sintética y evaluación de la energía acumulada.'
    : 'Recuperación de telemetría sintética mediante interpolación de datos ocultos y evaluación del error real.')

const tableRows = computed(() => {
  if (moduleId.value === 1) {
    const value = result.value as ReturnType<typeof module1Detention>
    return [
      { metric: 'Tiempo de detención', value: `${value.stoppingTime.toFixed(6)} s`, reference: `${value.parameters.v0 / value.parameters.acceleration} s`, error: `${Math.abs(value.stoppingTime - value.parameters.v0 / value.parameters.acceleration).toExponential(3)} s` },
      { metric: 'Distancia recorrida', value: `${value.stoppingDistance.toFixed(6)} m`, reference: `${value.referenceDistance.toFixed(6)} m`, error: `${value.distanceError.toExponential(3)} m` },
      { metric: 'Iteraciones de raíz', value: `${value.iterations}`, reference: 'Tolerancia 10⁻⁸', error: 'Bisección' },
    ]
  }

  if (moduleId.value === 3) {
    const value = result.value as ReturnType<typeof module3Wind>
    return [
      { metric: 'Desplazamiento máximo', value: `${value.maximumDisplacement.toFixed(6)} m`, reference: 'Integral RK4', error: `${value.points.length - 1} pasos` },
      { metric: 'Proxy de energía', value: value.energyProxy.toFixed(6), reference: '∫ |x|² dt', error: 'Trapecio compuesto' },
      { metric: 'Amortiguamiento', value: `${value.parameters.damping}`, reference: 'Parámetro sintético', error: selected.value },
    ]
  }

  const value = result.value as ReturnType<typeof module4Sensors>
  return value.testPoints.map((point, index) => ({
    metric: `Punto oculto ${index + 1} (t=${point.toFixed(3)})`,
    value: value.recovered[index]?.toFixed(8) ?? '0',
    reference: value.reference[index]?.toFixed(8) ?? '0',
    error: `${Math.abs((value.recovered[index] ?? 0) - (value.reference[index] ?? 0)).toExponential(3)}`,
  }))
})

const summaryMetrics = computed(() => {
  if (moduleId.value === 1) {
    const value = result.value as ReturnType<typeof module1Detention>
    const analyticalTime = value.parameters.v0 / value.parameters.acceleration
    return [
      { label: 'Raíz válida', value: value.stoppingTime.toFixed(6), unit: 's' },
      { label: 'Referencia analítica', value: analyticalTime.toFixed(6), unit: 's' },
      { label: 'Error absoluto', value: Math.abs(value.stoppingTime - analyticalTime).toExponential(3), unit: 's' },
      { label: 'Bisecciones', value: `${value.iterations}`, unit: 'iteraciones' },
    ]
  }
  if (moduleId.value === 3) {
    const value = result.value as ReturnType<typeof module3Wind>
    return [
      { label: 'Desplazamiento máximo', value: value.maximumDisplacement.toFixed(6), unit: 'm' },
      { label: 'Referencia libre', value: 'RK4 0.01 s', unit: 'paso' },
      { label: 'Proxy de energía', value: value.energyProxy.toFixed(6), unit: '∫x²dt' },
      { label: 'Pasos ejecutados', value: `${value.points.length - 1}`, unit: 'pasos RK4' },
    ]
  }
  const value = result.value as ReturnType<typeof module4Sensors>
  return [
    { label: 'Puntos ocultos', value: `${value.testPoints.length}`, unit: 'puntos' },
    { label: 'Referencia sin(t)', value: 'Analítica', unit: 'puntos reales' },
    { label: 'Error medio absoluto', value: value.meanAbsoluteError.toExponential(3), unit: 'señal' },
    { label: 'Pasos / nodos', value: `${value.parameters.step} / ${value.nodes.length}`, unit: 'muestra' },
  ]
})

const chartData = computed(() => {
  if (moduleId.value === 3) {
    const value = result.value as ReturnType<typeof module3Wind>
    const sampled = value.points.filter((_, index) => index % 20 === 0 || index === value.points.length - 1)
    return {
      title: 'Respuesta dinámica lateral',
      subtitle: 'Desplazamiento calculado con RK4',
      xLabel: 'Tiempo (s)',
      yLabel: 'Desplazamiento (m)',
      xEnd: 20,
      thresholdX: undefined,
      thresholdLabel: undefined,
      series: [
        { name: 'x(t)', values: sampled.map(row => row[2] ?? 0), color: '#2563eb' },
        { name: 'Movimiento abs.', values: sampled.map(row => Math.abs(row[2] ?? 0)), color: '#f97316', dashed: true },
      ] as ChartSeries[],
    }
  }
  if (moduleId.value === 4) {
    const value = result.value as ReturnType<typeof module4Sensors>
    return {
      title: 'Reconstrucción de telemetría',
      subtitle: 'Interpolación frente a la función de referencia',
      xLabel: 'Tiempo (s)',
      yLabel: 'Señal sintética',
      xEnd: value.testPoints.at(-1) ?? 1,
      thresholdX: undefined,
      thresholdLabel: undefined,
      series: [
        { name: 'Lagrange', values: value.recovered, color: '#2563eb' },
        { name: 'Referencia', values: value.reference, color: '#16a34a', dashed: true },
      ] as ChartSeries[],
    }
  }
  const value = result.value as ReturnType<typeof module1Detention>
  const sampleCount = 25
  const a = value.parameters.acceleration
  const v0 = value.parameters.v0
  const times = Array.from({ length: sampleCount }, (_, index) => value.stoppingTime * index / (sampleCount - 1))
  return {
    title: 'Velocidad durante la detención',
    subtitle: 'Solución lineal analítica v(t) = v₀ - at',
    xLabel: 'Tiempo (s)',
    yLabel: 'Velocidad (m/s)',
    xEnd: value.stoppingTime,
    thresholdX: value.stoppingTime,
    thresholdLabel: `Detención ${value.stoppingTime.toFixed(2)} s`,
    series: [
      { name: 'Velocidad', values: times.map(time => v0 - a * time), color: '#2563eb' },
      { name: 'Cero físico', values: times.map(() => 0), color: '#ef4444', dashed: true },
    ] as ChartSeries[],
  }
})

const numericalConclusion = computed(() => {
  if (moduleId.value === 1) {
    const value = result.value as ReturnType<typeof module1Detention>
    return `La integración produjo una distancia de ${value.stoppingDistance.toFixed(6)} m frente a ${value.referenceDistance.toFixed(6)} m analíticos. El error absoluto fue ${value.distanceError.toExponential(3)} m con ${value.iterations} iteraciones de bisección.`
  }
  if (moduleId.value === 3) {
    const value = result.value as ReturnType<typeof module3Wind>
    return `RK4 ejecutó ${value.points.length - 1} pasos y obtuvo un desplazamiento máximo de ${value.maximumDisplacement.toFixed(6)} m. El proxy de energía acumulada fue ${value.energyProxy.toFixed(6)}.`
  }
  const value = result.value as ReturnType<typeof module4Sensors>
  return `Lagrange recuperó ${value.testPoints.length} puntos ocultos con error medio absoluto de ${value.meanAbsoluteError.toExponential(3)} y paso sintético ${value.parameters.step}.`
})

const problemConclusion = computed(() => selected.value === 'MAL_CONDICIONADO'
  ? 'El escenario exige atención especial: los parámetros seleccionados aumentan la sensibilidad y deben interpretarse como una demostración numérica sintética, no como riesgo real.'
  : selected.value === 'ESTRES'
    ? 'El escenario de estrés conserva validez sintética, pero exige mayor precisión y puede aumentar la diferencia entre aproximación y referencia.'
    : 'El escenario normal proporciona una referencia reproducible para comparar precisión, estabilidad y resultados del modelo sintético.')

watch([moduleId, selected], () => {
  browserHistoryRepository().save({
    moduleId: moduleId.value,
    scenario: selected.value,
    summary: title.value,
  })
}, { immediate: true })
</script>

<template>
  <main class="container">
    <button class="back" @click="router.push('/')">← Volver</button>
    <h2>Módulo {{ moduleId }}: {{ title }}</h2>

    <div class="tabs">
      <button :class="{ active: selected === 'NORMAL' }" @click="selected = 'NORMAL'">NORMAL</button>
      <button :class="{ active: selected === 'ESTRES' }" @click="selected = 'ESTRES'">ESTRÉS</button>
      <button :class="{ active: selected === 'MAL_CONDICIONADO' }" @click="selected = 'MAL_CONDICIONADO'">MAL CONDICIONADO</button>
    </div>

    <div class="box">
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      <p><strong>Modelo:</strong> {{ scenario.equation }} | <strong>Escenario:</strong> {{ selected }}</p>
    </div>

    <div class="metric-grid">
      <article v-for="metric in summaryMetrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.unit }}</small>
      </article>
    </div>

    <NumericalChart
      :title="chartData.title"
      :subtitle="chartData.subtitle"
      :x-label="chartData.xLabel"
      :y-label="chartData.yLabel"
      :x-end="chartData.xEnd"
      :threshold-x="chartData.thresholdX"
      :threshold-label="chartData.thresholdLabel"
      :series="chartData.series"
    />

    <table>
      <thead>
        <tr>
          <th>Métrica</th>
          <th>Resultado calculado</th>
          <th>Referencia</th>
          <th>Error / detalle</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in tableRows" :key="row.metric">
          <td><strong>{{ row.metric }}</strong></td>
          <td>{{ row.value }}</td>
          <td>{{ row.reference }}</td>
          <td>{{ row.error }}</td>
        </tr>
      </tbody>
    </table>

    <div class="conclusions">
      <div class="box">
        <h4>Conclusión Numérica</h4>
        <p>{{ numericalConclusion }}</p>
      </div>
      <div class="box">
        <h4>Conclusión del Fenómeno</h4>
        <p>{{ problemConclusion }}</p>
      </div>
    </div>

    <aside class="history">
      <h3>Historial local</h3>
      <p>La ejecución queda almacenada en este navegador y sobrevive reinicios.</p>
    </aside>
  </main>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif; color: #1e293b; }
.back { margin-bottom: 1.5rem; padding: 0.5rem 0.8rem; border: 1px solid #cbd5e1; background: transparent; cursor: pointer; }
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
.tabs button { border: 1px solid #cbd5e1; background: white; border-radius: 6px; padding: 0.6rem 1rem; cursor: pointer; font-weight: 600; }
.tabs button.active { background: #0f172a; color: white; border-color: #0f172a; }
.box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; background: white; }
.box h3, .box h4 { margin-top: 0; }
table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.88rem; }
th, td { border: 1px solid #cbd5e1; padding: 0.6rem; text-align: left; }
th { background: #f1f5f9; }
.conclusions { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.history { border: 1px solid #cbd5e1; padding: 1rem 1.25rem; margin-top: 1.5rem; }
.history h3 { margin-top: 0; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem; }
.metric-card { display: flex; flex-direction: column; min-height: 96px; justify-content: center; border: 1px solid #dbe3ef; border-left: 4px solid #2563eb; border-radius: 10px; padding: 0.85rem 1rem; background: #fff; }
.metric-card span { color: #64748b; font-size: 0.78rem; }
.metric-card strong { margin-top: 0.28rem; color: #0f172a; font-size: 1.12rem; }
.metric-card small { color: #94a3b8; }
@media (max-width: 720px) { .tabs, .conclusions { flex-direction: column; display: flex; } table { display: block; overflow-x: auto; } }
@media (max-width: 820px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
