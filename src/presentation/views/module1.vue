<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { browserHistoryRepository } from '../../application/persistence/local-history'
import { module1Detention, type ScenarioParameters } from '../../domain/models/four-module-models'
import NumericalChart, { type ChartSeries } from '../components/NumericalChart.vue'
import { ModuleRunUseCases } from '../../application/persistence/module-run.use-cases'
import { ModuleRunPostgrestAdapter } from '../../infrastructure/module-run.postgrest.adapter'
import type { ModuleRunSnapshot, ModuleRunSummary } from '../../application/persistence/module-run.types'
import { Module1UseCases } from '../../application/use-cases/module1.use-cases'
import type { Module1ParametersPort } from '../../application/ports/module1.port'

const router = useRouter()
const useCases = new Module1UseCases()
const runUseCases = new ModuleRunUseCases(new ModuleRunPostgrestAdapter())
const tab = ref<'simulation' | 'history'>('simulation')
const label = ref('')
const team = ref('')
const editingId = ref<number | null>(null)
const history = ref<ModuleRunSummary[]>([])
const busy = ref(false)
const message = ref('')
const error = ref('')
const selected = ref<'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO'>('NORMAL')
const scenario = computed<ScenarioParameters>(() => ({
  name: selected.value,
  description: 'Caso sintético reproducible para análisis académico.',
  equation: "x' = v, v' = -a",
}))
const parameters = ref<Module1ParametersPort>({ v0: 20, acceleration: 2 })
const validationErrors = computed(() => useCases.validate(parameters.value))
const result = computed(() => validationErrors.value.length
  ? module1Detention(scenario.value)
  : useCases.calculate(scenario.value, parameters.value))

function chooseScenario(scenarioName: 'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO') {
  selected.value = scenarioName
  parameters.value = scenarioName === 'ESTRES'
    ? { v0: 24, acceleration: 2.8 }
    : scenarioName === 'MAL_CONDICIONADO'
      ? { v0: 24, acceleration: 0.4 }
      : { v0: 20, acceleration: 2 }
}

const metrics = computed(() => {
  const value = result.value
  const referenceTime = value.parameters.v0 / value.parameters.acceleration
  return [
    { label: 'Raíz válida', value: value.stoppingTime.toFixed(6), unit: 's' },
    { label: 'Referencia analítica', value: referenceTime.toFixed(6), unit: 's' },
    { label: 'Error absoluto', value: Math.abs(value.stoppingTime - referenceTime).toExponential(3), unit: 's' },
    { label: 'Bisecciones', value: `${value.iterations}`, unit: 'iteraciones' },
  ]
})

const tableRows = computed(() => {
  const value = result.value
  const referenceTime = value.parameters.v0 / value.parameters.acceleration
  return [
    { metric: 'Tiempo de detención', value: `${value.stoppingTime.toFixed(6)} s`, reference: `${referenceTime.toFixed(6)} s`, error: `${Math.abs(value.stoppingTime - referenceTime).toExponential(3)} s` },
    { metric: 'Distancia por trapecio compuesto', value: `${value.trapezoidalDistance.toFixed(8)} m`, reference: `${value.referenceDistance.toFixed(8)} m`, error: `${Math.abs(value.trapezoidalDistance - value.referenceDistance).toExponential(3)} m` },
    { metric: 'Distancia por Simpson 1/3', value: `${value.simpsonDistance.toFixed(8)} m`, reference: `${value.referenceDistance.toFixed(8)} m`, error: `${Math.abs(value.simpsonDistance - value.referenceDistance).toExponential(3)} m` },
    { metric: 'Distancia por Romberg', value: `${value.rombergDistance.toFixed(8)} m`, reference: `${value.referenceDistance.toFixed(8)} m`, error: `${value.distanceError.toExponential(3)} m` },
    { metric: 'Iteraciones de raíz', value: `${value.iterations}`, reference: 'Tolerancia 10⁻⁸', error: 'Bisección' },
  ]
})

const chartSeries = computed(() => {
  const value = result.value
  const times = Array.from({ length: 25 }, (_, index) => value.stoppingTime * index / 24)
  return [
    { name: 'Velocidad', values: times.map(time => value.parameters.v0 - value.parameters.acceleration * time), color: '#2563eb' },
    { name: 'Cero físico', values: times.map(() => 0), color: '#ef4444', dashed: true },
  ] as ChartSeries[]
})

const comparisonSeries = computed(() => [
  {
    name: 'Distancias numéricas',
    values: [result.value.trapezoidalDistance, result.value.simpsonDistance, result.value.rombergDistance],
    color: '#2563eb',
  },
  {
    name: 'Referencia',
    values: [result.value.referenceDistance, result.value.referenceDistance, result.value.referenceDistance],
    color: '#16a34a',
    dashed: true,
  },
] as ChartSeries[])

const snapshot = computed<ModuleRunSnapshot>(() => {
  const value = result.value
  return {
    moduleCode: 'M1',
    scenario: selected.value,
    parameters: value.parameters,
    methods: [
      { family: 'RAICES', method: 'BISECCION', converged: true, iterations: value.iterations, timeMs: 0, solution: value.stoppingTime, reference: value.parameters.v0 / value.parameters.acceleration, absoluteError: Math.abs(value.stoppingTime - value.parameters.v0 / value.parameters.acceleration), relativeError: null, percentageError: null, residual: null, interpretation: 'Raíz analítica de la velocidad' },
      { family: 'INTEGRACION', method: 'TRAPECIO', converged: true, iterations: 1000, timeMs: 0, solution: value.trapezoidalDistance, reference: value.referenceDistance, absoluteError: Math.abs(value.trapezoidalDistance - value.referenceDistance), relativeError: null, percentageError: null, residual: null, interpretation: 'Integración compuesta de la velocidad' },
      { family: 'INTEGRACION', method: 'SIMPSON_13', converged: true, iterations: 100, timeMs: 0, solution: value.simpsonDistance, reference: value.referenceDistance, absoluteError: Math.abs(value.simpsonDistance - value.referenceDistance), relativeError: null, percentageError: null, residual: null, interpretation: 'Simpson 1/3 compuesto' },
      { family: 'INTEGRACION', method: 'ROMBERG', converged: value.rombergConverged, iterations: value.rombergIterations, timeMs: 0, solution: value.rombergDistance, reference: value.referenceDistance, absoluteError: value.distanceError, relativeError: null, percentageError: null, residual: null, interpretation: 'Extrapolación de Romberg' },
      { family: 'EDO', method: 'RK2', converged: true, iterations: value.rk2Solution.length - 1, timeMs: 0, solution: value.rk2FinalPosition, reference: 0, absoluteError: Math.abs(value.rk2FinalPosition), relativeError: null, percentageError: null, residual: null, interpretation: 'RK2 punto medio' },
      { family: 'EDO', method: 'RK4', converged: true, iterations: value.rk2Solution.length - 1, timeMs: 0, solution: value.finalPosition, reference: 0, absoluteError: Math.abs(value.finalPosition), relativeError: null, percentageError: null, residual: null, interpretation: 'RK4 clásico' },
    ],
    charts: [],
    numericalConclusion: `La distancia integrada fue ${value.stoppingDistance.toFixed(6)} m frente a ${value.referenceDistance.toFixed(6)} m analíticos.`,
    problemConclusion: selected.value === 'MAL_CONDICIONADO'
      ? 'La baja desaceleración prolonga el frenado y aumenta la sensibilidad del tiempo.'
      : 'La referencia sintética permite comparar precisión y escenario.',
    savedAt: new Date().toISOString(),
  }
})

async function refreshHistory() {
  history.value = await runUseCases.list('M1')
}

async function saveRun() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    if (editingId.value) {
      await runUseCases.update(editingId.value, snapshot.value, label.value, team.value)
      message.value = `Simulación #${editingId.value} actualizada`
    } else {
      editingId.value = await runUseCases.save('M1', snapshot.value, label.value || `M1 ${selected.value}`, team.value)
      message.value = `Simulación #${editingId.value} guardada`
    }
    await refreshHistory()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function openRun(id: number) {
  const saved = await runUseCases.open(id)
  selected.value = saved.scenario
  const storedParams = saved.snapshot.parameters
  parameters.value = {
    v0: Number(storedParams.v0),
    acceleration: Number(storedParams.acceleration),
  }
  editingId.value = saved.id
  label.value = saved.label ?? ''
  team.value = saved.team ?? ''
  tab.value = 'simulation'
  message.value = `Simulación #${id} recuperada`
}

async function relaunchRun(id: number) {
  const saved = await runUseCases.open(id)
  selected.value = saved.scenario
  const storedParams = saved.snapshot.parameters
  parameters.value = { v0: Number(storedParams.v0), acceleration: Number(storedParams.acceleration) }
  const fresh = snapshot.value
  const matches = saved.snapshot.methods.every(savedMethod => {
    const freshMethod = fresh.methods.find(method => method.method === savedMethod.method)
    return freshMethod && JSON.stringify(savedMethod.solution) === JSON.stringify(freshMethod.solution)
  })
  editingId.value = id
  message.value = matches ? 'Reproducción exacta dentro de la representación almacenada' : 'Diferencias detectadas al relanzar'
  tab.value = 'simulation'
}

async function removeRun(id: number) {
  await runUseCases.remove(id)
  if (editingId.value === id) editingId.value = null
  await refreshHistory()
}

watch(selected, (scenario) => {
  browserHistoryRepository().save({
    moduleId: 1,
    scenario,
    summary: `Detención: ${result.value.stoppingTime.toFixed(6)} s`,
  })
}, { immediate: true })

onMounted(refreshHistory)
</script>

<template>
  <main class="container">
    <button class="back" @click="router.push('/')">← Volver</button>
    <h2>Módulo 1: Detención de Emergencia</h2>
    <nav class="main-tabs">
      <button :class="{ active: tab === 'simulation' }" @click="tab = 'simulation'">Simulador</button>
      <button :class="{ active: tab === 'history' }" @click="tab = 'history'; refreshHistory()">Historial ({{ history.length }})</button>
    </nav>
    <template v-if="tab === 'simulation'">
    <div class="tabs">
      <button :class="{ active: selected === 'NORMAL' }" @click="chooseScenario('NORMAL')">NORMAL</button>
      <button :class="{ active: selected === 'ESTRES' }" @click="chooseScenario('ESTRES')">ESTRÉS</button>
      <button :class="{ active: selected === 'MAL_CONDICIONADO' }" @click="chooseScenario('MAL_CONDICIONADO')">MAL CONDICIONADO</button>
    </div>
    <div class="box parameter-form">
      <h3>Parámetros editables</h3>
      <div class="fields">
        <label>Velocidad inicial v₀ (m/s)<input v-model.number="parameters.v0" type="number" min="0.0001" step="0.1" /></label>
        <label>Desaceleración a (m/s²)<input v-model.number="parameters.acceleration" type="number" min="0.0001" step="0.1" /></label>
      </div>
      <p v-if="validationErrors.length" class="danger">{{ validationErrors.join(' · ') }}</p>
    </div>
    <div class="box"><h3>Detención de emergencia</h3><p>Análisis sintético del tiempo y la distancia de frenado.</p><p><strong>Modelo:</strong> {{ scenario.equation }} | <strong>Escenario:</strong> {{ selected }}</p></div>
    <div class="metric-grid"><article v-for="metric in metrics" :key="metric.label" class="metric-card"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.unit }}</small></article></div>
    <NumericalChart title="Velocidad durante la detención" subtitle="Solución analítica v(t) = v₀ - at" x-label="Tiempo (s)" y-label="Velocidad (m/s)" :x-end="result.stoppingTime" :threshold-x="result.stoppingTime" :threshold-label="`Detención ${result.stoppingTime.toFixed(2)} s`" :series="chartSeries" />
    <NumericalChart title="Comparación de integración" subtitle="Distancia obtenida por tres métodos" x-label="Método" y-label="Distancia (m)" :x-end="2" :x-labels="['Trapecio', 'Simpson 1/3', 'Romberg']" :series="comparisonSeries" />
    <table><thead><tr><th>Métrica</th><th>Resultado calculado</th><th>Referencia</th><th>Error / detalle</th></tr></thead><tbody><tr v-for="row in tableRows" :key="row.metric"><td><strong>{{ row.metric }}</strong></td><td>{{ row.value }}</td><td>{{ row.reference }}</td><td>{{ row.error }}</td></tr></tbody></table>
    <div class="conclusions"><div class="box"><h4>Conclusión Numérica</h4><p>La distancia integrada fue {{ result.stoppingDistance.toFixed(6) }} m frente a {{ result.referenceDistance.toFixed(6) }} m analíticos.</p></div><div class="box"><h4>Conclusión del Fenómeno</h4><p>{{ selected === 'MAL_CONDICIONADO' ? 'La baja desaceleración prolonga el frenado y aumenta la sensibilidad del tiempo.' : 'La referencia sintética permite comparar precisión y escenario.' }}</p></div></div>
    <div class="box persistence">
      <h3>Historial PostgreSQL</h3>
      <input v-model="label" placeholder="Etiqueta" />
      <input v-model="team" placeholder="Equipo" />
      <button class="save" :disabled="busy" @click="saveRun">{{ editingId ? `Actualizar #${editingId}` : 'Guardar como nueva' }}</button>
      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="error" class="danger">{{ error }}</p>
    </div>
    </template>
    <div v-else class="box">
      <h3>Simulaciones guardadas</h3>
      <p v-if="history.length === 0">No hay simulaciones persistidas.</p>
      <table v-else><thead><tr><th>ID</th><th>Etiqueta</th><th>Escenario</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="row in history" :key="row.id"><td>#{{ row.id }}</td><td>{{ row.label }}</td><td>{{ row.scenario }}</td><td>{{ row.estado }}</td><td><button @click="openRun(row.id)">Abrir</button> <button @click="relaunchRun(row.id)">Relanzar</button> <button @click="removeRun(row.id)">Eliminar</button></td></tr></tbody></table>
    </div>
  </main>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif; color: #1e293b; }
.back { margin-bottom: 1.5rem; }.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }.tabs button { border: 1px solid #cbd5e1; background: white; border-radius: 999px; padding: 0.55rem 0.9rem; font-weight: 700; }.tabs button.active { background: #0f172a; color: white; }
.main-tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid #cbd5e1; margin-bottom: 1.25rem; }.main-tabs button { border: 0; border-bottom: 3px solid transparent; background: transparent; padding: 0.7rem 1rem; }.main-tabs button.active { border-bottom-color: #2563eb; font-weight: 700; }.persistence input { margin-right: 0.5rem; padding: 0.5rem; }.persistence .save { margin-left: 0.5rem; }.success { color: #166534; }.danger { color: #991b1b; }.parameter-form .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }.parameter-form label { display: grid; gap: 0.35rem; }.parameter-form input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.6rem; }
.box { border: 1px solid #dbe3ef; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; }.box h3,.box h4 { margin-top: 0; }.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem; }.metric-card { display: flex; flex-direction: column; min-height: 96px; justify-content: center; border: 1px solid #dbe3ef; border-left: 4px solid #2563eb; border-radius: 10px; padding: 0.85rem 1rem; }.metric-card span,.metric-card small { color: #64748b; }.metric-card strong { margin: 0.28rem 0; }table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }th,td { border: 1px solid #cbd5e1; padding: 0.6rem; text-align: left; }th { background: #f1f5f9; }.conclusions { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }@media (max-width: 820px) {.metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.conclusions { grid-template-columns: 1fr; }}
</style>
