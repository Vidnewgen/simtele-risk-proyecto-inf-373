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
  description: 'Caso sintético reproducible para reconstrucción de telemetría y análisis de ruido.',
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
  { label: 'Puntos Ocultos', value: `${result.value.testPoints.length}`, unit: 'puntos', desc: 'Muestras de validación ciega' },
  { label: 'Referencia Teórica', value: 'sin(t)', unit: 'analítica', desc: 'Señal sintética pura' },
  { label: 'Mejor Error Medio', value: Math.min(result.value.lagrangeError, result.value.newtonError, result.value.splineError).toExponential(3), unit: 'MAE', desc: 'Mínimo entre interpoladores' },
  { label: 'Paso / Nodos', value: `${result.value.parameters.step} / ${result.value.nodes.length}`, unit: 'nodos', desc: 'Densidad de discretización' },
])

const chartSeries = computed(() => [
  { name: 'Lagrange', values: result.value.lagrangeRecovered, color: '#2563eb' },
  { name: 'Newton-DD', values: result.value.newtonRecovered, color: '#7c3aed', dashed: true },
  { name: 'Spline Cúbico Natural', values: result.value.splineRecovered, color: '#f97316', dashed: true },
  { name: 'Referencia Analítica', values: result.value.reference, color: '#16a34a', dashed: true },
] as ChartSeries[])

const tableRows = computed(() => result.value.testPoints.map((point, index) => ({
  metric: `Punto oculto ${index + 1} (t = ${point.toFixed(3)} s)`,
  value: result.value.lagrangeRecovered[index]?.toFixed(8) ?? '0',
  reference: result.value.reference[index]?.toFixed(8) ?? '0',
  error: `${Math.abs((result.value.lagrangeRecovered[index] ?? 0) - (result.value.reference[index] ?? 0)).toExponential(3)}`,
})))

const methodComparison = computed(() => [
  { method: 'Polinomio de Lagrange', error: result.value.lagrangeError, values: result.value.lagrangeRecovered },
  { method: 'Newton por Diferencias Divididas', error: result.value.newtonError, values: result.value.newtonRecovered },
  { method: 'Spline Cúbico Natural', error: result.value.splineError, values: result.value.splineRecovered },
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
    ? 'El espaciamiento amplio entre nodos y el ruido inducido provocan oscilaciones espurias (fenómeno de Runge) en los bordes.'
    : 'La distribución uniforme de nodos permite una interpolación estable con errores residuales acotados.',
  savedAt: new Date().toISOString(),
}))

async function refreshHistory() {
  history.value = await runUseCases.list('M4')
}

async function saveRun() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    if (editingId.value) {
      await runUseCases.update(editingId.value, snapshot.value, label.value, team.value)
      message.value = `Simulación #${editingId.value} actualizada exitosamente`
    } else {
      editingId.value = await runUseCases.save('M4', snapshot.value, label.value || `M4 ${selected.value}`, team.value)
      message.value = `Simulación #${editingId.value} guardada en PostgreSQL`
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
    step: Number(storedParams.step),
    nodeCount: Number(storedParams.nodeCount),
    noiseAmplitude: Number(storedParams.noiseAmplitude),
  }
  editingId.value = saved.id
  label.value = saved.label ?? ''
  team.value = saved.team ?? ''
  tab.value = 'simulation'
  message.value = `Simulación #${id} recuperada exitosamente`
}

async function relaunchRun(id: number) {
  const saved = await runUseCases.open(id)
  selected.value = saved.scenario
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
  editingId.value = id
  tab.value = 'simulation'
  message.value = matches ? 'Reproducción exacta de los resultados almacenados' : 'Diferencias detectadas al relanzar'
}

async function removeRun(id: number) {
  if (!confirm(`¿Eliminar la simulación #${id}?`)) return
  await runUseCases.remove(id)
  if (editingId.value === id) editingId.value = null
  await refreshHistory()
}

watch(selected, (scenario) => {
  browserHistoryRepository().save({
    moduleId: 4,
    scenario,
    summary: `Error medio: ${result.value.meanAbsoluteError.toExponential(3)}`,
  })
}, { immediate: true })

onMounted(refreshHistory)
</script>

<template>
  <div class="module-page">
    <!-- ── Module Header ── -->
    <header class="module-header">
      <div class="header-inner">
        <div class="header-nav">
          <button class="back-link" @click="router.push('/')">
            <svg viewBox="0 0 20 20" fill="currentColor" class="back-icon" aria-hidden="true">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
            <span>Panel Principal</span>
          </button>
          <div class="academic-badge">UMSA · INF-373</div>
        </div>

        <div class="header-title-row">
          <div class="header-titles">
            <div class="code-badge">MÓDULO 04</div>
            <h1 class="page-title">Reconstrucción de Telemetría</h1>
            <p class="page-subtitle">Interpolación polinomial (Lagrange, Newton por diferencias divididas) y splines cúbicos naturales ante pérdida de datos</p>
          </div>
          <div class="header-meta">
            <span class="status-indicator">Sistema Activo</span>
          </div>
        </div>

        <!-- ── Main Tabs ── -->
        <nav class="main-tabs" aria-label="Secciones del módulo">
          <button class="tab-btn" :class="{ 'is-active': tab === 'simulation' }" @click="tab = 'simulation'">
            Simulador Numérico
          </button>
          <button class="tab-btn" :class="{ 'is-active': tab === 'history' }" @click="tab = 'history'; refreshHistory()">
            Historial de Persistencia ({{ history.length }})
          </button>
        </nav>
      </div>
    </header>

    <!-- ── Main Content Area ── -->
    <main class="module-main">
      <!-- ── TAB: SIMULADOR ── -->
      <template v-if="tab === 'simulation'">
        <!-- ── Scenario Bar ── -->
        <section class="control-bar" aria-label="Selector de Escenario">
          <div class="scenario-group">
            <span class="control-label">Escenario Sintético:</span>
            <div class="scenario-buttons">
              <button
                class="scenario-pill"
                :class="{ 'is-active': selected === 'NORMAL' }"
                @click="chooseScenario('NORMAL')"
              >
                Normal
              </button>
              <button
                class="scenario-pill"
                :class="{ 'is-active': selected === 'ESTRES' }"
                @click="chooseScenario('ESTRES')"
              >
                Estrés
              </button>
              <button
                class="scenario-pill"
                :class="{ 'is-active': selected === 'MAL_CONDICIONADO' }"
                @click="chooseScenario('MAL_CONDICIONADO')"
              >
                Mal Condicionado
              </button>
            </div>
          </div>
          <div class="equation-tag">
            <span class="eq-label">Modelo:</span>
            <code class="eq-code">{{ scenario.equation }}</code>
          </div>
        </section>

        <!-- ── Parameters Form ── -->
        <section class="card form-card">
          <div class="card-header">
            <h2 class="card-title">Parámetros de Muestreo y Perturbación</h2>
            <span class="card-caption">Discretización de nodos y nivel de ruido blanco simulado</span>
          </div>

          <div class="card-body">
            <div class="fields-grid fields-grid-3">
              <div class="field-item">
                <label for="m4-step" class="field-label">Paso entre nodos (s)</label>
                <input
                  id="m4-step"
                  v-model.number="parameters.step"
                  type="number"
                  min="0.0001"
                  step="0.05"
                  class="field-input"
                />
                <span class="field-hint">Intervalo temporal Δt entre sensores</span>
              </div>

              <div class="field-item">
                <label for="m4-nodes" class="field-label">Cantidad de nodos</label>
                <input
                  id="m4-nodes"
                  v-model.number="parameters.nodeCount"
                  type="number"
                  min="7"
                  step="1"
                  class="field-input"
                />
                <span class="field-hint">Total de muestras conocidas (≥ 7)</span>
              </div>

              <div class="field-item">
                <label for="m4-noise" class="field-label">Amplitud de ruido instrumental</label>
                <input
                  id="m4-noise"
                  v-model.number="parameters.noiseAmplitude"
                  type="number"
                  min="0"
                  step="0.01"
                  class="field-input"
                />
                <span class="field-hint">Perturbación estocástica aditiva</span>
              </div>
            </div>

            <div v-if="validationErrors.length" class="alert-banner alert-error" role="alert">
              <span class="alert-title">Inconsistencia en los parámetros:</span>
              <span class="alert-text">{{ validationErrors.join(' · ') }}</span>
            </div>
          </div>
        </section>

        <!-- ── Key Metrics Grid ── -->
        <section class="metrics-grid" aria-label="Métricas Principales">
          <div v-for="m in metrics" :key="m.label" class="metric-card">
            <span class="metric-title">{{ m.label }}</span>
            <div class="metric-value-wrap">
              <span class="metric-number">{{ m.value }}</span>
              <span class="metric-unit">{{ m.unit }}</span>
            </div>
            <span class="metric-desc">{{ m.desc }}</span>
          </div>
        </section>

        <!-- ── Method Comparison Table ── -->
        <section class="card table-card" aria-label="Comparación de Métodos de Interpolación">
          <div class="card-header">
            <h2 class="card-title">Comparación de Métodos de Interpolación</h2>
            <span class="card-caption">Error absoluto medio (MAE) en los puntos de prueba ocultos</span>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Método de Interpolación</th>
                  <th scope="col">Error Medio Absoluto</th>
                  <th scope="col">Evaluación en Puntos Ocultos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in methodComparison" :key="row.method">
                  <td class="font-medium">{{ row.method }}</td>
                  <td class="tabular-num font-mono">
                    <span class="error-badge">{{ row.error.toExponential(3) }}</span>
                  </td>
                  <td class="tabular-num text-xs text-muted">
                    {{ row.values.map(value => value.toFixed(6)).join(', ') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ── Charts Grid ── -->
        <section class="charts-layout" aria-label="Visualización Gráfica">
          <div class="chart-wrapper">
            <NumericalChart
              title="Reconstrucción de Telemetría"
              subtitle="Interpolación frente a la señal analítica continua de referencia"
              x-label="Tiempo (s)"
              y-label="Señal Sintética"
              :x-end="result.testPoints.at(-1) ?? 1"
              :series="chartSeries"
            />
          </div>
          <div class="chart-wrapper">
            <NumericalChart
              title="Error Medio por Método"
              subtitle="Dispersión del error absoluto en puntos ciegos"
              x-label="Método"
              y-label="Error Absoluto Medio"
              :x-end="2"
              :x-labels="['Lagrange', 'Newton-DD', 'Spline']"
              :series="errorSeries"
            />
          </div>
        </section>

        <!-- ── Numerical Table: Puntos Ocultos ── -->
        <section class="card table-card" aria-label="Evaluación de Puntos Ocultos">
          <div class="card-header">
            <h2 class="card-title">Evaluación Punto a Punto en Sensores Ocultos</h2>
            <span class="card-caption">Contraste directo entre el valor reconstruido y el valor analítico</span>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Punto Evaluado</th>
                  <th scope="col">Valor Reconstruido (Lagrange)</th>
                  <th scope="col">Valor Teórico Real</th>
                  <th scope="col">Error Absoluto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in tableRows" :key="row.metric">
                  <td class="font-medium">{{ row.metric }}</td>
                  <td class="tabular-num font-mono">{{ row.value }}</td>
                  <td class="tabular-num text-muted font-mono">{{ row.reference }}</td>
                  <td>
                    <span class="error-badge">{{ row.error }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ── Analytical Conclusions ── -->
        <section class="conclusions-grid" aria-label="Conclusiones Técnicas">
          <div class="conclusion-card conclusion-numeric">
            <div class="conclusion-badge">Precisión Numérica</div>
            <h3 class="conclusion-title">Conclusión Numérica</h3>
            <p class="conclusion-text">
              El método de Lagrange reconstruyó los <strong>{{ result.testPoints.length }} puntos ocultos</strong>
              con un error medio absoluto de <strong>{{ result.meanAbsoluteError.toExponential(3) }}</strong>.
              El spline cúbico natural evidenció estabilidad suavizada sin oscilaciones divergentes de orden alto.
            </p>
          </div>

          <div class="conclusion-card conclusion-phenomenon">
            <div class="conclusion-badge">Telemetría de Transporte</div>
            <h3 class="conclusion-title">Conclusión del Fenómeno</h3>
            <p class="conclusion-text">
              {{ selected === 'MAL_CONDICIONADO'
                ? 'El espaciamiento amplio entre nodos y el ruido introducido degradan la estabilidad de los polinomios de orden elevado (fenómeno de Runge).'
                : 'La red de sensores proporciona una densidad suficiente para recuperar señales continuas de telemetría ante pérdidas transitorias de paquetes.'
              }}
            </p>
          </div>
        </section>

        <!-- ── Persistence Actions ── -->
        <section class="card persistence-card" aria-label="Persistencia en Base de Datos">
          <div class="card-header">
            <h2 class="card-title">Almacenamiento de Simulación (PostgreSQL)</h2>
            <span class="card-caption">Registro de interpolaciones para contraste y validación experimental</span>
          </div>
          <div class="card-body">
            <div class="persistence-form">
              <div class="persistence-inputs">
                <input
                  v-model="label"
                  type="text"
                  placeholder="Etiqueta identificadora (ej. Telemetría torre 2)"
                  class="field-input"
                  aria-label="Etiqueta"
                />
                <input
                  v-model="team"
                  type="text"
                  placeholder="Equipo / Investigador (opcional)"
                  class="field-input"
                  aria-label="Equipo"
                />
              </div>
              <button
                class="primary-btn"
                :disabled="busy"
                @click="saveRun"
              >
                {{ busy ? 'Procesando...' : (editingId ? `Actualizar Registro #${editingId}` : 'Guardar Simulación') }}
              </button>
            </div>

            <div v-if="message" class="alert-banner alert-success" role="status">
              <span class="alert-text">{{ message }}</span>
            </div>
            <div v-if="error" class="alert-banner alert-error" role="alert">
              <span class="alert-text">{{ error }}</span>
            </div>
          </div>
        </section>
      </template>

      <!-- ── TAB: HISTORIAL ── -->
      <section v-else class="card history-card" aria-label="Historial de Simulaciones">
        <div class="card-header">
          <div>
            <h2 class="card-title">Simulaciones Persistidas — Módulo 4</h2>
            <span class="card-caption">Auditoría y reproducibilidad de corridas en PostgreSQL</span>
          </div>
          <button class="secondary-btn" @click="refreshHistory">
            Actualizar Lista
          </button>
        </div>

        <div class="card-body">
          <div v-if="history.length === 0" class="empty-state">
            <div class="empty-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-svg" aria-hidden="true">
                <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p class="empty-title">No hay simulaciones guardadas</p>
            <p class="empty-text">Ejecute una simulación en la pestaña "Simulador Numérico" y guárdela para consultarla aquí.</p>
          </div>

          <div v-else class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Etiqueta</th>
                  <th scope="col">Escenario</th>
                  <th scope="col">Estado</th>
                  <th scope="col" class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in history" :key="row.id">
                  <td class="tabular-num font-mono">#{{ row.id }}</td>
                  <td class="font-medium">{{ row.label || '—' }}</td>
                  <td>
                    <span class="scenario-tag">{{ row.scenario }}</span>
                  </td>
                  <td>
                    <span class="status-badge-inline">{{ row.estado }}</span>
                  </td>
                  <td class="text-right">
                    <div class="action-buttons">
                      <button class="action-btn action-open" @click="openRun(row.id)">Abrir</button>
                      <button class="action-btn action-relaunch" @click="relaunchRun(row.id)">Relanzar</button>
                      <button class="action-btn action-delete" @click="removeRun(row.id)">Eliminar</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.module-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--sr-bg-page, #f8fafc);
  color: var(--sr-text-primary, #0f172a);
}

/* ── Header ── */
.module-header {
  background-color: #0b1120;
  border-bottom: 1px solid #1e293b;
  color: #ffffff;
}
.header-inner {
  max-width: 1240px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 0;
}
.header-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.825rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s ease;
}
.back-link:hover {
  color: #ffffff;
}
.back-icon {
  width: 16px;
  height: 16px;
}
.academic-badge {
  font-size: 0.72rem;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.header-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.code-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #60a5fa;
  margin-bottom: 0.35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.page-title {
  font-size: clamp(1.4rem, 2.5vw, 1.85rem);
  font-weight: 800;
  color: #f8fafc;
  margin: 0 0 0.35rem;
  letter-spacing: -0.02em;
}
.page-subtitle {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
  max-width: 720px;
}
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #4ade80;
  background-color: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.25);
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
}

/* ── Tabs ── */
.main-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid #1e293b;
}
.tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #94a3b8;
  padding: 0.65rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tab-btn:hover {
  color: #f8fafc;
}
.tab-btn.is-active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

/* ── Main Container ── */
.module-main {
  max-width: 1240px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3.5rem;
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Control Bar ── */
.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.85rem 1.25rem;
}
.scenario-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.control-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}
.scenario-buttons {
  display: flex;
  gap: 0.4rem;
}
.scenario-pill {
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}
.scenario-pill:hover {
  border-color: #94a3b8;
  color: #0f172a;
}
.scenario-pill.is-active {
  background-color: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}
.equation-tag {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
}
.eq-label {
  color: #64748b;
  font-weight: 600;
}
.eq-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background-color: #f1f5f9;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  color: #1e40af;
  font-weight: 600;
}

/* ── Cards ── */
.card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.card-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.card-caption {
  font-size: 0.75rem;
  color: #64748b;
}
.card-body {
  padding: 1.25rem;
}

/* ── Form Fields ── */
.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
}
.fields-grid-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.field-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: #334155;
}
.field-input {
  padding: 0.55rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  font-size: 0.875rem;
  font-family: inherit;
  color: #0f172a;
  background-color: #ffffff;
  transition: all 0.15s ease;
}
.field-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.field-hint {
  font-size: 0.72rem;
  color: #94a3b8;
}

/* ── Metrics Grid ── */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
.metric-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #2563eb;
  border-radius: 6px;
  padding: 1rem 1.15rem;
  display: flex;
  flex-direction: column;
}
.metric-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.35rem;
}
.metric-value-wrap {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  margin-bottom: 0.25rem;
}
.metric-number {
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.metric-unit {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}
.metric-desc {
  font-size: 0.72rem;
  color: #94a3b8;
}

/* ── Charts Layout ── */
.charts-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}
.chart-wrapper {
  min-width: 0;
}

/* ── Tables ── */
.table-container {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  text-align: left;
}
.data-table th {
  background-color: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}
.data-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}
.data-table tr:hover td {
  background-color: #f8fafc;
}
.tabular-num {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.font-medium {
  font-weight: 600;
  color: #0f172a;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.text-muted {
  color: #64748b;
}
.text-right {
  text-align: right;
}
.error-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background-color: #f1f5f9;
  color: #475569;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

/* ── Conclusions ── */
.conclusions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}
.conclusion-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
}
.conclusion-numeric {
  border-left: 4px solid #2563eb;
}
.conclusion-phenomenon {
  border-left: 4px solid #0f172a;
}
.conclusion-badge {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 0.25rem;
}
.conclusion-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.5rem;
}
.conclusion-text {
  font-size: 0.85rem;
  line-height: 1.55;
  color: #475569;
  margin: 0;
}

/* ── Persistence Form ── */
.persistence-form {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}
.persistence-inputs {
  display: flex;
  gap: 0.75rem;
  flex: 1;
  min-width: 280px;
}
.primary-btn {
  background-color: #0f172a;
  color: #ffffff;
  border: 1px solid #0f172a;
  padding: 0.55rem 1.25rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.primary-btn:hover:not(:disabled) {
  background-color: #1e293b;
}
.primary-btn:disabled {
  background-color: #f1f5f9;
  color: #94a3b8;
  border-color: #e2e8f0;
  cursor: not-allowed;
}
.secondary-btn {
  background-color: #ffffff;
  color: #334155;
  border: 1px solid #cbd5e1;
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.secondary-btn:hover {
  background-color: #f8fafc;
  border-color: #94a3b8;
}

/* ── Alerts ── */
.alert-banner {
  margin-top: 1rem;
  padding: 0.65rem 1rem;
  border-radius: 6px;
  font-size: 0.825rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.alert-error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}
.alert-success {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}
.alert-title {
  font-weight: 700;
}

/* ── History Table & Empty State ── */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}
.empty-icon-wrap {
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  border-radius: 8px;
  background-color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}
.empty-svg {
  width: 24px;
  height: 24px;
}
.empty-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #334155;
  margin: 0 0 0.25rem;
}
.empty-text {
  font-size: 0.825rem;
  color: #64748b;
  margin: 0;
}
.scenario-tag {
  font-size: 0.72rem;
  font-weight: 600;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  color: #334155;
}
.status-badge-inline {
  font-size: 0.72rem;
  font-weight: 600;
  color: #15803d;
  background-color: #f0fdf4;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid #bbf7d0;
}
.action-buttons {
  display: flex;
  gap: 0.35rem;
  justify-content: flex-end;
}
.action-btn {
  padding: 0.25rem 0.55rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}
.action-open {
  background-color: #eff6ff;
  color: #1d4ed8;
  border-color: #dbeafe;
}
.action-open:hover {
  background-color: #dbeafe;
}
.action-relaunch {
  background-color: #f8fafc;
  color: #334155;
  border-color: #e2e8f0;
}
.action-relaunch:hover {
  background-color: #f1f5f9;
}
.action-delete {
  background-color: #fef2f2;
  color: #b91c1c;
  border-color: #fee2e2;
}
.action-delete:hover {
  background-color: #fee2e2;
}

/* ── Responsive ── */
@media (max-width: 960px) {
  .fields-grid-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .charts-layout {
    grid-template-columns: 1fr;
  }
  .conclusions-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .header-title-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .control-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  .fields-grid-3 {
    grid-template-columns: 1fr;
  }
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  .persistence-inputs {
    flex-direction: column;
  }
}
</style>
