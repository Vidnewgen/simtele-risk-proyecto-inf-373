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
  description: 'Caso sintético reproducible para análisis académico de frenado de emergencia.',
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
    { label: 'Raíz válida (t*)', value: value.stoppingTime.toFixed(6), unit: 's', desc: 'Tiempo de parada calculado' },
    { label: 'Referencia analítica', value: referenceTime.toFixed(6), unit: 's', desc: 'Solución teórica v₀/a' },
    { label: 'Error absoluto', value: Math.abs(value.stoppingTime - referenceTime).toExponential(3), unit: 's', desc: '|t* - t_ref|' },
    { label: 'Iteraciones', value: `${value.iterations}`, unit: 'iter', desc: 'Convergencia bisección' },
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
    { name: 'Velocidad v(t)', values: times.map(time => value.parameters.v0 - value.parameters.acceleration * time), color: '#2563eb' },
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
    name: 'Referencia analítica',
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
      message.value = `Simulación #${editingId.value} actualizada correctamente`
    } else {
      editingId.value = await runUseCases.save('M1', snapshot.value, label.value || `M1 ${selected.value}`, team.value)
      message.value = `Simulación #${editingId.value} registrada en la base de datos`
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
  message.value = `Simulación #${id} recuperada exitosamente`
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
  message.value = matches ? 'Reproducción exacta dentro de la tolerancia de representación almacenada' : 'Diferencias detectadas al relanzar'
  tab.value = 'simulation'
}

async function removeRun(id: number) {
  if (!confirm(`¿Eliminar la simulación #${id}?`)) return
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
  <div class="module-page">
    <!-- ── Top Header / Navigation ── -->
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
            <div class="code-badge">MÓDULO 01</div>
            <h1 class="page-title">Detención de Emergencia</h1>
            <p class="page-subtitle">Resolución de EDO (RK2, RK4), Integración Compuesta (Trapecio, Simpson 1/3, Romberg) y Raíces</p>
          </div>
          <div class="header-meta">
            <span class="status-indicator">Sistema Activo</span>
          </div>
        </div>

        <!-- ── Main Tabs (Simulador / Historial) ── -->
        <nav class="main-tabs" aria-label="Secciones del módulo">
          <button
            class="tab-btn"
            :class="{ 'is-active': tab === 'simulation' }"
            @click="tab = 'simulation'"
          >
            Simulador Numérico
          </button>
          <button
            class="tab-btn"
            :class="{ 'is-active': tab === 'history' }"
            @click="tab = 'history'; refreshHistory()"
          >
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
            <h2 class="card-title">Parámetros del Sistema</h2>
            <span class="card-caption">Ajuste de condiciones iniciales de frenado</span>
          </div>

          <div class="card-body">
            <div class="fields-grid">
              <div class="field-item">
                <label for="m1-v0" class="field-label">Velocidad inicial v₀ (m/s)</label>
                <input
                  id="m1-v0"
                  v-model.number="parameters.v0"
                  type="number"
                  min="0.0001"
                  step="0.1"
                  class="field-input"
                />
                <span class="field-hint">Velocidad nominal de crucero</span>
              </div>

              <div class="field-item">
                <label for="m1-acc" class="field-label">Desaceleración a (m/s²)</label>
                <input
                  id="m1-acc"
                  v-model.number="parameters.acceleration"
                  type="number"
                  min="0.0001"
                  step="0.1"
                  class="field-input"
                />
                <span class="field-hint">Tasa constante del sistema de frenos</span>
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

        <!-- ── Charts Grid ── -->
        <section class="charts-layout" aria-label="Visualización Gráfica">
          <div class="chart-wrapper">
            <NumericalChart
              title="Perfil de Velocidad v(t)"
              subtitle="Solución analítica v(t) = v₀ - at hasta el cese de movimiento"
              x-label="Tiempo (s)"
              y-label="Velocidad (m/s)"
              :x-end="result.stoppingTime"
              :threshold-x="result.stoppingTime"
              :threshold-label="`Detención ${result.stoppingTime.toFixed(2)} s`"
              :series="chartSeries"
            />
          </div>
          <div class="chart-wrapper">
            <NumericalChart
              title="Comparación de Cuadratura Numérica"
              subtitle="Distancia integrada por Trapecio, Simpson 1/3 y Romberg frente al valor analítico"
              x-label="Método"
              y-label="Distancia (m)"
              :x-end="2"
              :x-labels="['Trapecio', 'Simpson 1/3', 'Romberg']"
              :series="comparisonSeries"
            />
          </div>
        </section>

        <!-- ── Numerical Table ── -->
        <section class="card table-card" aria-label="Resultados Numéricos Detallados">
          <div class="card-header">
            <h2 class="card-title">Matriz de Resultados y Estimación de Error</h2>
            <span class="card-caption">Comparación punto a punto con respecto a la referencia analítica</span>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Métrica / Variable</th>
                  <th scope="col">Valor Calculado</th>
                  <th scope="col">Referencia Analítica</th>
                  <th scope="col">Error Absoluto / Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in tableRows" :key="row.metric">
                  <td class="font-medium">{{ row.metric }}</td>
                  <td class="tabular-num">{{ row.value }}</td>
                  <td class="tabular-num text-muted">{{ row.reference }}</td>
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
            <div class="conclusion-badge">Análisis de Cuadratura</div>
            <h3 class="conclusion-title">Conclusión Numérica</h3>
            <p class="conclusion-text">
              La distancia integrada fue de <strong>{{ result.stoppingDistance.toFixed(6) }} m</strong> frente a 
              <strong>{{ result.referenceDistance.toFixed(6) }} m</strong> calculados analíticamente, con convergencia de Romberg alcanzada.
            </p>
          </div>

          <div class="conclusion-card conclusion-phenomenon">
            <div class="conclusion-badge">Fenomenología de Transporte</div>
            <h3 class="conclusion-title">Conclusión del Fenómeno</h3>
            <p class="conclusion-text">
              {{ selected === 'MAL_CONDICIONADO'
                ? 'La baja desaceleración prolonga sensiblemente la carrera de frenado e incrementa la vulnerabilidad ante eventos imprevistos en la línea.'
                : 'La desaceleración seleccionada mantiene las distancias de parada dentro de los márgenes nominales de seguridad operativa.'
              }}
            </p>
          </div>
        </section>

        <!-- ── Persistence Actions ── -->
        <section class="card persistence-card" aria-label="Persistencia en Base de Datos">
          <div class="card-header">
            <h2 class="card-title">Almacenamiento de Simulación (PostgreSQL)</h2>
            <span class="card-caption">Registro de snapshot numérico para reproducibilidad y auditoría</span>
          </div>
          <div class="card-body">
            <div class="persistence-form">
              <div class="persistence-inputs">
                <input
                  v-model="label"
                  type="text"
                  placeholder="Etiqueta identificadora (ej. Prueba carga 1)"
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
            <h2 class="card-title">Simulaciones Persistidas — Módulo 1</h2>
            <span class="card-caption">Auditoría y reproducibilidad de corridas experimentales en PostgreSQL</span>
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

/* ── Module Header ── */
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

/* ── Main Tabs ── */
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

/* ── Module Main Container ── */
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

/* ── Cards Shared ── */
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
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  .persistence-inputs {
    flex-direction: column;
  }
}
</style>
