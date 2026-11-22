<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { browserHistoryRepository } from '../../application/persistence/local-history'
import { module4Sensors, type ScenarioParameters } from '../../domain/models/four-module-models'
import NumericalChart, { type ChartSeries } from '../components/NumericalChart.vue'
import { ModuleRunUseCases } from '../../application/persistence/module-run.use-cases'
import { ModuleRunPostgrestAdapter } from '../../infrastructure/module-run.postgrest.adapter'
import type { ModuleRunSnapshot, ModuleRunSummary } from '../../application/persistence/module-run.types'
import { Module4UseCases } from '../../application/use-cases/module4.use-cases'
import type { Module4ParametersPort } from '../../application/ports/module4.port'

const router = useRouter()
const useCases = new Module4UseCases()
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
  description: 'Caso sintético reproducible para reconstrucción de telemetría.',
  equation: 'p(t) interpolada con Lagrange',
}))
const parameters = ref<Module4ParametersPort>({ step: 0.25, nodeCount: 9, noiseAmplitude: 0 })
const validationErrors = computed(() => useCases.validate(parameters.value))
const result = computed(() => validationErrors.value.length
  ? module4Sensors(scenario.value)
  : useCases.calculate(scenario.value, parameters.value))
function chooseScenario(scenarioName: 'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO') {
  selected.value = scenarioName
  parameters.value = scenarioName === 'ESTRES'
    ? { step: 0.5, nodeCount: 9, noiseAmplitude: 0.08 }
    : scenarioName === 'MAL_CONDICIONADO'
      ? { step: 1.5, nodeCount: 9, noiseAmplitude: 0.25 }
      : { step: 0.25, nodeCount: 9, noiseAmplitude: 0 }
}
const metrics = computed(() => [
  { label: 'Puntos ocultos', value: `${result.value.testPoints.length}`, unit: 'puntos' },
  { label: 'Referencia sin(t)', value: 'Analítica', unit: 'puntos reales' },
  { label: 'Mejor error medio', value: Math.min(result.value.lagrangeError, result.value.newtonError, result.value.splineError).toExponential(3), unit: 'señal' },
  { label: 'Pasos / nodos', value: `${result.value.parameters.step} / ${result.value.nodes.length}`, unit: 'muestra' },
])
const chartSeries = computed(() => [
  { name: 'Lagrange', values: result.value.lagrangeRecovered, color: '#2563eb' },
  { name: 'Newton-DD', values: result.value.newtonRecovered, color: '#7c3aed', dashed: true },
  { name: 'Spline cúbico', values: result.value.splineRecovered, color: '#f97316', dashed: true },
  { name: 'Referencia', values: result.value.reference, color: '#16a34a', dashed: true },
] as ChartSeries[])
const tableRows = computed(() => result.value.testPoints.map((point, index) => ({
  metric: `Punto oculto ${index + 1} (t=${point.toFixed(3)})`,
  value: result.value.lagrangeRecovered[index]?.toFixed(8) ?? '0',
  reference: result.value.reference[index]?.toFixed(8) ?? '0',
  error: `${Math.abs((result.value.lagrangeRecovered[index] ?? 0) - (result.value.reference[index] ?? 0)).toExponential(3)}`,
})))
const methodComparison = computed(() => [
  { method: 'Lagrange', error: result.value.lagrangeError, values: result.value.lagrangeRecovered },
  { method: 'Newton-DD', error: result.value.newtonError, values: result.value.newtonRecovered },
  { method: 'Spline cúbico natural', error: result.value.splineError, values: result.value.splineRecovered },
])
const errorSeries = computed(() => [
  {
    name: 'Error medio por método',
    values: [result.value.lagrangeError, result.value.newtonError, result.value.splineError],
    color: '#dc2626',
  },
] as ChartSeries[])
const snapshot = computed<ModuleRunSnapshot>(() => ({
  moduleCode: 'M4',
  scenario: selected.value,
  parameters: { step: result.value.parameters.step, hiddenTestCount: result.value.parameters.hiddenTestCount, nodes: result.value.nodes },
  methods: [
    { family: 'INTERPOLACION', method: 'LAGRANGE', converged: true, iterations: result.value.nodes.length, timeMs: 0, solution: result.value.lagrangeRecovered, reference: result.value.reference, absoluteError: result.value.lagrangeError, relativeError: null, percentageError: null, residual: null, interpretation: 'Interpolación de Lagrange en puntos ocultos' },
    { family: 'INTERPOLACION', method: 'NEWTON_DD', converged: true, iterations: result.value.nodes.length, timeMs: 0, solution: result.value.newtonRecovered, reference: result.value.reference, absoluteError: result.value.newtonError, relativeError: null, percentageError: null, residual: null, interpretation: 'Newton por diferencias divididas' },
    { family: 'INTERPOLACION', method: 'SPLINE_CUBICO', converged: true, iterations: result.value.nodes.length - 1, timeMs: 0, solution: result.value.splineRecovered, reference: result.value.reference, absoluteError: result.value.splineError, relativeError: null, percentageError: null, residual: null, interpretation: 'Spline cúbico natural' },
  ],
  charts: [],
  numericalConclusion: `Lagrange recuperó ${result.value.testPoints.length} puntos ocultos con error medio absoluto de ${result.value.meanAbsoluteError.toExponential(3)}.`,
  problemConclusion: selected.value === 'MAL_CONDICIONADO'
    ? 'Los nodos espaciados y el ruido sintético aumentan la sensibilidad.'
    : 'El escenario permite evaluar nodos, estabilidad y precisión.',
  savedAt: new Date().toISOString(),
}))

async function refreshHistory() { history.value = await runUseCases.list('M4') }
async function saveRun() {
  busy.value = true; error.value = ''; message.value = ''
  try {
    if (editingId.value) { await runUseCases.update(editingId.value, snapshot.value, label.value, team.value); message.value = `Simulación #${editingId.value} actualizada` }
    else { editingId.value = await runUseCases.save('M4', snapshot.value, label.value || `M4 ${selected.value}`, team.value); message.value = `Simulación #${editingId.value} guardada` }
    await refreshHistory()
  } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}
async function openRun(id: number) {
  const saved = await runUseCases.open(id); selected.value = saved.scenario
  const storedParams = saved.snapshot.parameters
  parameters.value = {
    step: Number(storedParams.step),
    nodeCount: Number(storedParams.nodeCount),
    noiseAmplitude: Number(storedParams.noiseAmplitude),
  }
  editingId.value = saved.id; label.value = saved.label ?? ''; team.value = saved.team ?? ''; tab.value = 'simulation'; message.value = `Simulación #${id} recuperada`
}
async function relaunchRun(id: number) {
  const saved = await runUseCases.open(id); selected.value = saved.scenario
  const storedParams = saved.snapshot.parameters
  parameters.value = {
    step: Number(storedParams.step),
    nodeCount: Number(storedParams.nodeCount),
    noiseAmplitude: Number(storedParams.noiseAmplitude),
  }
  const matches = saved.snapshot.methods.every(method => {
    const fresh = snapshot.value.methods.find(row => row.method === method.method)
    return fresh && JSON.stringify(method.solution) === JSON.stringify(fresh.solution)
  })
  editingId.value = id; tab.value = 'simulation'; message.value = matches ? 'Reproducción exacta' : 'Diferencias detectadas al relanzar'
}
async function removeRun(id: number) { await runUseCases.remove(id); if (editingId.value === id) editingId.value = null; await refreshHistory() }

watch(selected, (scenario) => {
  browserHistoryRepository().save({ moduleId: 4, scenario, summary: `Error medio: ${result.value.meanAbsoluteError.toExponential(3)}` })
}, { immediate: true })
onMounted(refreshHistory)
</script>

<template>
  <main class="container">
    <button class="back" @click="router.push('/')">← Volver</button>
    <h2>Módulo 4: Reconstrucción de Sensores</h2>
    <nav class="main-tabs"><button :class="{ active: tab === 'simulation' }" @click="tab = 'simulation'">Simulador</button><button :class="{ active: tab === 'history' }" @click="tab = 'history'; refreshHistory()">Historial ({{ history.length }})</button></nav>
    <template v-if="tab === 'simulation'">
    <div class="tabs"><button :class="{ active: selected === 'NORMAL' }" @click="chooseScenario('NORMAL')">NORMAL</button><button :class="{ active: selected === 'ESTRES' }" @click="chooseScenario('ESTRES')">ESTRÉS</button><button :class="{ active: selected === 'MAL_CONDICIONADO' }" @click="chooseScenario('MAL_CONDICIONADO')">MAL CONDICIONADO</button></div>
    <div class="box parameter-form">
      <h3>Parámetros editables</h3>
      <div class="fields">
        <label>Paso entre nodos<input v-model.number="parameters.step" type="number" min="0.0001" step="0.05" /></label>
        <label>Cantidad de nodos<input v-model.number="parameters.nodeCount" type="number" min="7" step="1" /></label>
        <label>Amplitud de ruido<input v-model.number="parameters.noiseAmplitude" type="number" min="0" step="0.01" /></label>
      </div>
      <p v-if="validationErrors.length" class="danger">{{ validationErrors.join(' · ') }}</p>
    </div>
    <div class="box"><h3>Reconstrucción de telemetría</h3><p>Recuperación sintética de datos mediante puntos ocultos.</p><p><strong>Modelo:</strong> {{ scenario.equation }} | <strong>Escenario:</strong> {{ selected }}</p></div>
    <div class="metric-grid"><article v-for="metric in metrics" :key="metric.label" class="metric-card"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.unit }}</small></article></div>
    <table class="method-table"><thead><tr><th>Método</th><th>Error medio absoluto</th><th>Evaluación en puntos ocultos</th></tr></thead><tbody><tr v-for="row in methodComparison" :key="row.method"><td><strong>{{ row.method }}</strong></td><td>{{ row.error.toExponential(3) }}</td><td>{{ row.values.map(value => value.toFixed(6)).join(', ') }}</td></tr></tbody></table>
    <NumericalChart title="Reconstrucción de telemetría" subtitle="Interpolación frente a la función de referencia" x-label="Tiempo (s)" y-label="Señal sintética" :x-end="result.testPoints.at(-1) ?? 1" :series="chartSeries" />
    <NumericalChart title="Error medio por método" subtitle="Comparación de precisión en puntos ocultos" x-label="Método" y-label="Error absoluto medio" :x-end="2" :x-labels="['Lagrange', 'Newton-DD', 'Spline']" :series="errorSeries" />
    <table><thead><tr><th>Métrica</th><th>Resultado calculado</th><th>Referencia</th><th>Error / detalle</th></tr></thead><tbody><tr v-for="row in tableRows" :key="row.metric"><td><strong>{{ row.metric }}</strong></td><td>{{ row.value }}</td><td>{{ row.reference }}</td><td>{{ row.error }}</td></tr></tbody></table>
    <div class="conclusions"><div class="box"><h4>Conclusión Numérica</h4><p>Lagrange recuperó {{ result.testPoints.length }} puntos ocultos con error medio absoluto de {{ result.meanAbsoluteError.toExponential(3) }}.</p></div><div class="box"><h4>Conclusión del Fenómeno</h4><p>{{ selected === 'MAL_CONDICIONADO' ? 'Los nodos espaciados y el ruido sintético aumentan la sensibilidad.' : 'El escenario permite evaluar nodos, estabilidad y precisión.' }}</p></div></div>
    <div class="box persistence"><h3>Historial PostgreSQL</h3><input v-model="label" placeholder="Etiqueta" /><input v-model="team" placeholder="Equipo" /><button :disabled="busy" @click="saveRun">{{ editingId ? `Actualizar #${editingId}` : 'Guardar como nueva' }}</button><p v-if="message" class="success">{{ message }}</p><p v-if="error" class="danger">{{ error }}</p></div>
    </template>
    <div v-else class="box"><h3>Simulaciones guardadas</h3><p v-if="history.length === 0">No hay simulaciones persistidas.</p><table v-else><thead><tr><th>ID</th><th>Etiqueta</th><th>Escenario</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="row in history" :key="row.id"><td>#{{ row.id }}</td><td>{{ row.label }}</td><td>{{ row.scenario }}</td><td>{{ row.estado }}</td><td><button @click="openRun(row.id)">Abrir</button> <button @click="relaunchRun(row.id)">Relanzar</button> <button @click="removeRun(row.id)">Eliminar</button></td></tr></tbody></table></div>
  </main>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif; color: #1e293b; }.back { margin-bottom: 1.5rem; }.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }.tabs button { border: 1px solid #cbd5e1; background: white; border-radius: 999px; padding: 0.55rem 0.9rem; font-weight: 700; }.tabs button.active { background: #0f172a; color: white; }.box { border: 1px solid #dbe3ef; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; }.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem; }.metric-card { display: flex; flex-direction: column; min-height: 96px; justify-content: center; border: 1px solid #dbe3ef; border-left: 4px solid #2563eb; border-radius: 10px; padding: 0.85rem 1rem; }.metric-card span,.metric-card small { color: #64748b; }.metric-card strong { margin: 0.28rem 0; }table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }th,td { border: 1px solid #cbd5e1; padding: 0.6rem; text-align: left; }th { background: #f1f5f9; }.conclusions { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }.main-tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid #cbd5e1; margin-bottom: 1.25rem; }.main-tabs button { border: 0; border-bottom: 3px solid transparent; background: transparent; padding: 0.7rem 1rem; }.main-tabs button.active { border-bottom-color: #2563eb; font-weight: 700; }.persistence input { margin-right: 0.5rem; padding: 0.5rem; }.success { color: #166534; }.danger { color: #991b1b; }.parameter-form .fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }.parameter-form label { display: grid; gap: 0.35rem; }.parameter-form input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.6rem; }@media (max-width: 820px) {.metric-grid,.conclusions { grid-template-columns: repeat(2, minmax(0, 1fr)); }.parameter-form .fields { grid-template-columns: 1fr; }}
</style>
