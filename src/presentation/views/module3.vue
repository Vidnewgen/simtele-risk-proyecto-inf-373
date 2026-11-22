<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { browserHistoryRepository } from '../../application/persistence/local-history'
import { module3Wind, type ScenarioParameters } from '../../domain/models/four-module-models'
import NumericalChart, { type ChartSeries } from '../components/NumericalChart.vue'
import { ModuleRunUseCases } from '../../application/persistence/module-run.use-cases'
import { ModuleRunPostgrestAdapter } from '../../infrastructure/module-run.postgrest.adapter'
import type { ModuleRunSnapshot, ModuleRunSummary } from '../../application/persistence/module-run.types'
import { Module3UseCases } from '../../application/use-cases/module3.use-cases'
import type { Module3ParametersPort } from '../../application/ports/module3.port'

const router = useRouter()
const useCases = new Module3UseCases()
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
  description: 'Caso sintético reproducible para vibración lateral.',
  equation: "x' = v, v' = (F - cv - kx)/m",
}))
const parameters = ref<Module3ParametersPort>({ mass: 1, damping: 1.2, stiffness: 4, amplitude: 1, duration: 20, step: 0.01 })
const validationErrors = computed(() => useCases.validate(parameters.value))
const result = computed(() => validationErrors.value.length
  ? module3Wind(scenario.value)
  : useCases.calculate(scenario.value, parameters.value))
function chooseScenario(scenarioName: 'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO') {
  selected.value = scenarioName
  parameters.value = scenarioName === 'ESTRES'
    ? { mass: 1, damping: 0.8, stiffness: 4, amplitude: 3, duration: 20, step: 0.01 }
    : scenarioName === 'MAL_CONDICIONADO'
      ? { mass: 1, damping: 0.02, stiffness: 4, amplitude: 3, duration: 20, step: 0.01 }
      : { mass: 1, damping: 1.2, stiffness: 4, amplitude: 1, duration: 20, step: 0.01 }
}
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

const comparisonSeries = computed(() => {
  const forced = result.value.points.filter((_, index) => index % 20 === 0 || index === result.value.points.length - 1)
  const rk2 = result.value.rk2Points.filter((_, index) => index % 20 === 0 || index === result.value.rk2Points.length - 1)
  const freeReference = result.value.freeReferencePoints.filter((_, index) => index % 20 === 0)
  return [
    { name: 'RK4 forzado', values: forced.map(row => row[2] ?? 0), color: '#2563eb' },
    { name: 'RK2 punto medio', values: rk2.map(row => row[2] ?? 0), color: '#7c3aed', dashed: true },
    { name: 'Referencia libre', values: freeReference.map(row => row[2] ?? 0), color: '#16a34a', dashed: true },
  ] as ChartSeries[]
})
const tableRows = computed(() => [
  { metric: 'Desplazamiento máximo', value: `${result.value.maximumDisplacement.toFixed(6)} m`, reference: 'Integral RK4', error: `${result.value.points.length - 1} pasos` },
  { metric: 'Proxy de energía', value: result.value.energyProxy.toFixed(6), reference: '∫ |x|² dt', error: 'Trapecio compuesto' },
  { metric: 'Amortiguamiento', value: `${result.value.parameters.damping}`, reference: 'Parámetro sintético', error: selected.value },
])
const snapshot = computed<ModuleRunSnapshot>(() => ({
  moduleCode: 'M3',
  scenario: selected.value,
  parameters: result.value.parameters,
  methods: [
    { family: 'EDO', method: 'RK2', converged: true, iterations: result.value.rk2Points.length - 1, timeMs: 0, solution: result.value.rk2Points.at(-1)?.slice(1) ?? [], reference: result.value.freeReferencePoints.at(-1)?.slice(1) ?? [], absoluteError: null, relativeError: null, percentageError: null, residual: null, interpretation: 'RK2 punto medio con paso 0.01 s' },
    { family: 'EDO', method: 'RK4', converged: true, iterations: result.value.points.length - 1, timeMs: 0, solution: result.value.maximumDisplacement, reference: null, absoluteError: null, relativeError: null, percentageError: null, residual: null, interpretation: 'RK4 clásico y integral de energía' },
    { family: 'INTEGRACION', method: 'TRAPECIO', converged: true, iterations: 500, timeMs: 0, solution: result.value.energyProxy, reference: null, absoluteError: null, relativeError: null, percentageError: null, residual: null, interpretation: 'Trapecio compuesto para x²' },
  ],
  charts: [],
  numericalConclusion: `RK4 ejecutó ${result.value.points.length - 1} pasos y obtuvo desplazamiento máximo de ${result.value.maximumDisplacement.toFixed(6)} m.`,
  problemConclusion: selected.value === 'MAL_CONDICIONADO'
    ? 'El bajo amortiguamiento prolonga la respuesta y aumenta la sensibilidad dinámica.'
    : 'El escenario permite comparar amortiguamiento y respuesta.',
  savedAt: new Date().toISOString(),
}))

async function refreshHistory() { history.value = await runUseCases.list('M3') }
async function saveRun() {
  busy.value = true; error.value = ''; message.value = ''
  try {
    if (editingId.value) { await runUseCases.update(editingId.value, snapshot.value, label.value, team.value); message.value = `Simulación #${editingId.value} actualizada` }
    else { editingId.value = await runUseCases.save('M3', snapshot.value, label.value || `M3 ${selected.value}`, team.value); message.value = `Simulación #${editingId.value} guardada` }
    await refreshHistory()
  } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}
async function openRun(id: number) {
  const saved = await runUseCases.open(id); selected.value = saved.scenario
  const storedParams = saved.snapshot.parameters
  parameters.value = {
    mass: Number(storedParams.mass),
    damping: Number(storedParams.damping),
    stiffness: Number(storedParams.stiffness),
    amplitude: Number(storedParams.amplitude),
    duration: Number(storedParams.duration),
    step: Number(storedParams.step),
  }
  editingId.value = saved.id; label.value = saved.label ?? ''; team.value = saved.team ?? ''; tab.value = 'simulation'; message.value = `Simulación #${id} recuperada`
}
async function relaunchRun(id: number) {
  const saved = await runUseCases.open(id); selected.value = saved.scenario
  const storedParams = saved.snapshot.parameters
  parameters.value = {
    mass: Number(storedParams.mass),
    damping: Number(storedParams.damping),
    stiffness: Number(storedParams.stiffness),
    amplitude: Number(storedParams.amplitude),
    duration: Number(storedParams.duration),
    step: Number(storedParams.step),
  }
  const matches = saved.snapshot.methods.every(method => {
    const fresh = snapshot.value.methods.find(row => row.method === method.method)
    return fresh && JSON.stringify(method.solution) === JSON.stringify(fresh.solution)
  })
  editingId.value = id; tab.value = 'simulation'; message.value = matches ? 'Reproducción exacta' : 'Diferencias detectadas al relanzar'
}
async function removeRun(id: number) { await runUseCases.remove(id); if (editingId.value === id) editingId.value = null; await refreshHistory() }

watch(selected, (scenario) => {
  browserHistoryRepository().save({ moduleId: 3, scenario, summary: `Desplazamiento máximo: ${result.value.maximumDisplacement.toFixed(6)} m` })
}, { immediate: true })
onMounted(refreshHistory)
</script>

<template>
  <main class="container">
    <button class="back" @click="router.push('/')">← Volver</button>
    <h2>Módulo 3: Oscilaciones por Viento</h2>
    <nav class="main-tabs"><button :class="{ active: tab === 'simulation' }" @click="tab = 'simulation'">Simulador</button><button :class="{ active: tab === 'history' }" @click="tab = 'history'; refreshHistory()">Historial ({{ history.length }})</button></nav>
    <template v-if="tab === 'simulation'">
    <div class="tabs"><button :class="{ active: selected === 'NORMAL' }" @click="chooseScenario('NORMAL')">NORMAL</button><button :class="{ active: selected === 'ESTRES' }" @click="chooseScenario('ESTRES')">ESTRÉS</button><button :class="{ active: selected === 'MAL_CONDICIONADO' }" @click="chooseScenario('MAL_CONDICIONADO')">MAL CONDICIONADO</button></div>
    <div class="box parameter-form">
      <h3>Parámetros editables</h3>
      <div class="fields">
        <label>Masa m (kg)<input v-model.number="parameters.mass" type="number" min="0.0001" step="0.1" /></label>
        <label>Amortiguamiento c (N·s/m)<input v-model.number="parameters.damping" type="number" min="0" step="0.1" /></label>
        <label>Rigidez k (N/m)<input v-model.number="parameters.stiffness" type="number" min="0.0001" step="0.1" /></label>
        <label>Amplitud de fuerza (N)<input v-model.number="parameters.amplitude" type="number" min="0" step="0.1" /></label>
        <label>Duración (s)<input v-model.number="parameters.duration" type="number" min="0.1" step="1" /></label>
        <label>Paso RK (s)<input v-model.number="parameters.step" type="number" min="0.0001" step="0.01" /></label>
      </div>
      <p v-if="validationErrors.length" class="danger">{{ validationErrors.join(' · ') }}</p>
    </div>
    <div class="box"><h3>Respuesta dinámica lateral</h3><p>Vibración sintética ante fuerza lateral periódica.</p><p><strong>Modelo:</strong> {{ scenario.equation }} | <strong>Escenario:</strong> {{ selected }}</p></div>
    <div class="metric-grid"><article v-for="metric in metrics" :key="metric.label" class="metric-card"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.unit }}</small></article></div>
    <NumericalChart title="Respuesta dinámica lateral" subtitle="Desplazamiento calculado con RK4" x-label="Tiempo (s)" y-label="Desplazamiento (m)" :x-end="parameters.duration" :series="chartSeries" />
    <NumericalChart title="RK2, RK4 y referencia libre" subtitle="Comparación temporal con fuerza anulada" x-label="Tiempo (s)" y-label="Desplazamiento (m)" :x-end="parameters.duration" :series="comparisonSeries" />
    <table><thead><tr><th>Métrica</th><th>Resultado calculado</th><th>Referencia</th><th>Error / detalle</th></tr></thead><tbody><tr v-for="row in tableRows" :key="row.metric"><td><strong>{{ row.metric }}</strong></td><td>{{ row.value }}</td><td>{{ row.reference }}</td><td>{{ row.error }}</td></tr></tbody></table>
    <div class="conclusions"><div class="box"><h4>Conclusión Numérica</h4><p>RK4 ejecutó {{ result.points.length - 1 }} pasos y obtuvo desplazamiento máximo de {{ result.maximumDisplacement.toFixed(6) }} m.</p></div><div class="box"><h4>Conclusión del Fenómeno</h4><p>{{ selected === 'MAL_CONDICIONADO' ? 'El bajo amortiguamiento prolonga la respuesta y aumenta la sensibilidad dinámica.' : 'El escenario permite comparar amortiguamiento y respuesta.' }}</p></div></div>
    <div class="box persistence"><h3>Historial PostgreSQL</h3><input v-model="label" placeholder="Etiqueta" /><input v-model="team" placeholder="Equipo" /><button :disabled="busy" @click="saveRun">{{ editingId ? `Actualizar #${editingId}` : 'Guardar como nueva' }}</button><p v-if="message" class="success">{{ message }}</p><p v-if="error" class="danger">{{ error }}</p></div>
    </template>
    <div v-else class="box"><h3>Simulaciones guardadas</h3><p v-if="history.length === 0">No hay simulaciones persistidas.</p><table v-else><thead><tr><th>ID</th><th>Etiqueta</th><th>Escenario</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="row in history" :key="row.id"><td>#{{ row.id }}</td><td>{{ row.label }}</td><td>{{ row.scenario }}</td><td>{{ row.estado }}</td><td><button @click="openRun(row.id)">Abrir</button> <button @click="relaunchRun(row.id)">Relanzar</button> <button @click="removeRun(row.id)">Eliminar</button></td></tr></tbody></table></div>
  </main>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif; color: #1e293b; }.back { margin-bottom: 1.5rem; }.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }.tabs button { border: 1px solid #cbd5e1; background: white; border-radius: 999px; padding: 0.55rem 0.9rem; font-weight: 700; }.tabs button.active { background: #0f172a; color: white; }.box { border: 1px solid #dbe3ef; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; }.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem; }.metric-card { display: flex; flex-direction: column; min-height: 96px; justify-content: center; border: 1px solid #dbe3ef; border-left: 4px solid #2563eb; border-radius: 10px; padding: 0.85rem 1rem; }.metric-card span,.metric-card small { color: #64748b; }.metric-card strong { margin: 0.28rem 0; }table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }th,td { border: 1px solid #cbd5e1; padding: 0.6rem; text-align: left; }th { background: #f1f5f9; }.conclusions { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }.main-tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid #cbd5e1; margin-bottom: 1.25rem; }.main-tabs button { border: 0; border-bottom: 3px solid transparent; background: transparent; padding: 0.7rem 1rem; }.main-tabs button.active { border-bottom-color: #2563eb; font-weight: 700; }.persistence input { margin-right: 0.5rem; padding: 0.5rem; }.success { color: #166534; }.danger { color: #991b1b; }.parameter-form .fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }.parameter-form label { display: grid; gap: 0.35rem; }.parameter-form input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.6rem; }@media (max-width: 820px) {.metric-grid,.conclusions { grid-template-columns: repeat(2, minmax(0, 1fr)); }.parameter-form .fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }}
</style>
