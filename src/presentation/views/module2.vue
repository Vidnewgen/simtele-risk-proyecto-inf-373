<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Module2UseCases } from '@/application/use-cases/module2.use-cases'
import { Module2PostgrestAdapter } from '@/infrastructure/module2.postgrest.adapter'
import { damage } from '@/domain/math/roots'
import {
  LINEAR_METHODS,
  METHOD_LABELS,
  ROOT_METHODS,
  type MethodCode,
  type MethodResult,
  type Module2Params,
  type Module2Run,
  type RootMethodCode,
  type ScenarioInfo,
  type ScenarioType,
  type SimulationSummary,
  type VerificationReport,
} from '@/domain/models/simulation.models'
import LineChart from '@/presentation/components/LineChart.vue'
import type { ChartSeries } from '@/presentation/components/chart.types'
import { formatPercent, formatSci, formatVector } from '@/presentation/utils/format'

const router = useRouter()
const useCases = new Module2UseCases(new Module2PostgrestAdapter())

/* ----------------------------- definición de campos ----------------------------- */

type NumKey =
  | 'D0' | 'alpha' | 'beta' | 'D_umbral' | 't_inspeccion'
  | 'a' | 'b' | 'x0' | 's0' | 's1'
  | 'perturbacion_b1' | 'tolerancia' | 'max_iter'

interface FieldDef {
  key: NumKey
  label: string
  hint: string
}

const fieldGroups: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Modelo de deterioro: D(t) = D₀ + α·t + β·t²',
    fields: [
      { key: 'D0', label: 'D₀', hint: 'Indicador inicial (≥ 0)' },
      { key: 'alpha', label: 'α', hint: 'Tasa lineal (≥ 0), 1/mes' },
      { key: 'beta', label: 'β', hint: 'Término cuadrático, 1/mes²' },
      { key: 'D_umbral', label: 'D umbral', hint: 'Debe ser > D₀' },
      { key: 't_inspeccion', label: 't inspección', hint: 'Meses programados' },
    ],
  },
  {
    title: 'Estimación de Raíces: D(t) − D_umbral = 0',
    fields: [
      { key: 'a', label: 'a (bisección)', hint: 'Extremo izquierdo ≥ 0' },
      { key: 'b', label: 'b (bisección)', hint: 'Extremo derecho > a' },
      { key: 'x0', label: 'x₀ (Newton)', hint: 'Semilla inicial' },
      { key: 's0', label: 's₀ (secante)', hint: 'Primera semilla' },
      { key: 's1', label: 's₁ (secante)', hint: 'Segunda semilla' },
    ],
  },
  {
    title: 'Calibración Lineal y Control Numérico',
    fields: [
      { key: 'perturbacion_b1', label: 'Perturbación de b₁', hint: 'Fracción, ej. 0.05 = +5 %' },
      { key: 'tolerancia', label: 'Tolerancia', hint: 'Entre 0 y 1, ej. 1e-6' },
      { key: 'max_iter', label: 'Máx. iteraciones', hint: 'Entero 1 a 100000' },
    ],
  },
]

const scenarios: { type: ScenarioType; label: string }[] = [
  { type: 'NORMAL', label: 'Normal' },
  { type: 'ESTRES', label: 'Estrés' },
  { type: 'MAL_CONDICIONADO', label: 'Mal Condicionado' },
]

const TIPO_LABEL: Record<ScenarioType, string> = {
  NORMAL: 'Normal',
  ESTRES: 'Estrés',
  MAL_CONDICIONADO: 'Mal Condicionado',
}

const COLORS: Record<MethodCode, string> = {
  JACOBI: '#2563eb',
  GAUSS_SEIDEL: '#16a34a',
  GRADIENTE_CONJUGADO: '#d97706',
  LU: '#64748b',
  BISECCION: '#7c3aed',
  NEWTON_RAPHSON: '#dc2626',
  SECANTE: '#0891b2',
}

/* ---------------------------------- estado ---------------------------------- */

const tab = ref<'sim' | 'hist'>('sim')
const selected = ref<ScenarioType>('NORMAL')
const info = ref<ScenarioInfo | null>(null)
const form = ref<Module2Params | null>(null)
const run = ref<Module2Run | null>(null)
const computedKey = ref('')
const banner = ref('')
const editingId = ref<number | null>(null)
const label = ref('')
const equipo = ref('')
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const message = ref('')

const sims = ref<SimulationSummary[]>([])
const search = ref('')
const editing = reactive({ id: null as number | null, label: '', equipo: '' })
const verification = ref<{ id: number; report: VerificationReport } | null>(null)
const iterMethod = ref<MethodCode>('JACOBI')

const current = computed(() => run.value?.data ?? null)
const problems = computed(() => (form.value ? useCases.validate(form.value) : []))
const dirty = computed(
  () => run.value !== null && form.value !== null && JSON.stringify(form.value) !== computedKey.value,
)

const cloneParams = (p: Module2Params): Module2Params => ({ ...p, x_ref: [...p.x_ref] })
const defaultLabel = (): string => `M2 ${selected.value} ${new Date().toLocaleString()}`
const fmtDate = (iso: string): string => new Date(iso).toLocaleString()

/* ------------------------------- acciones del simulador ------------------------------- */

function compute(): void {
  error.value = ''
  message.value = ''
  if (!info.value || !form.value) return
  try {
    run.value = useCases.calculate(info.value, form.value)
    computedKey.value = JSON.stringify(form.value)
    banner.value =
      editingId.value === null
        ? 'Cálculo ejecutado exitosamente (sin guardar)'
        : `Recalculado a partir de la simulación #${editingId.value} (cambios pendientes de guardar)`
    verification.value = null
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function selectScenario(type: ScenarioType, params?: Module2Params, autoCompute = true): Promise<void> {
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const sc = await useCases.loadScenario(type)
    info.value = sc
    selected.value = type
    form.value = cloneParams(params ?? sc.params)
    if (autoCompute) compute()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function chooseScenario(type: ScenarioType): void {
  editingId.value = null
  label.value = ''
  equipo.value = ''
  void selectScenario(type)
}

function resetParams(): void {
  if (info.value) {
    form.value = cloneParams(info.value.params)
    compute()
  }
}

/* ----------------------------------- CRUD ----------------------------------- */

async function refreshHistory(): Promise<void> {
  try {
    sims.value = await useCases.list(search.value)
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function saveNew(): Promise<void> {
  if (!run.value || dirty.value) return
  busy.value = true
  error.value = ''
  try {
    const id = await useCases.save(run.value, {
      label: label.value.trim() || defaultLabel(),
      equipo: equipo.value.trim() || undefined,
    })
    editingId.value = id
    banner.value = `Guardada como simulación #${id}`
    message.value = `Simulación guardada con ID #${id}`
    await refreshHistory()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function overwrite(): Promise<void> {
  const id = editingId.value
  if (!run.value || dirty.value || id === null) return
  busy.value = true
  error.value = ''
  try {
    await useCases.update(id, run.value, {
      label: label.value.trim() || defaultLabel(),
      equipo: equipo.value.trim() || undefined,
    })
    banner.value = `Simulación #${id} actualizada en la base de datos`
    message.value = `Simulación #${id} actualizada correctamente`
    await refreshHistory()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function openSaved(id: number): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    const saved = await useCases.open(id)
    await selectScenario(saved.tipo, saved.run.params, false)
    run.value = saved.run
    computedKey.value = JSON.stringify(form.value)
    banner.value = `Simulación guardada #${id} (leída de la base de datos)`
    editingId.value = id
    label.value = saved.etiqueta ?? ''
    equipo.value = saved.equipo ?? ''
    verification.value = null
    tab.value = 'sim'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function relaunch(id: number): Promise<void> {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    const { saved, fresh, report } = await useCases.relaunch(id)
    await selectScenario(saved.tipo, saved.run.params, false)
    run.value = fresh
    computedKey.value = JSON.stringify(form.value)
    banner.value = `Relanzada desde #${id}: se recalcularon todos los métodos con los parámetros guardados`
    editingId.value = id
    label.value = saved.etiqueta ?? ''
    equipo.value = saved.equipo ?? ''
    verification.value = { id, report }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

function startRename(s: SimulationSummary): void {
  editing.id = s.id
  editing.label = s.etiqueta ?? ''
  editing.equipo = s.equipo ?? ''
}

async function saveRename(): Promise<void> {
  const id = editing.id
  if (id === null) return
  busy.value = true
  error.value = ''
  try {
    await useCases.rename(id, {
      label: editing.label.trim() || undefined,
      equipo: editing.equipo.trim() || undefined,
    })
    if (editingId.value === id) {
      label.value = editing.label.trim()
      equipo.value = editing.equipo.trim()
    }
    editing.id = null
    message.value = `Simulación #${id} renombrada exitosamente`
    await refreshHistory()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function removeSim(id: number): Promise<void> {
  if (!window.confirm(`¿Eliminar la simulación #${id} y todos sus resultados?`)) return
  busy.value = true
  error.value = ''
  try {
    await useCases.remove(id)
    if (editingId.value === id) {
      editingId.value = null
      banner.value = `La simulación #${id} fue eliminada de la base de datos`
    }
    if (verification.value?.id === id) verification.value = null
    message.value = `Simulación #${id} eliminada`
    await refreshHistory()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

/* ----------------------------- datos derivados para la vista ----------------------------- */

const statusOf = (r: MethodResult): string =>
  r.converged ? 'Convergió' : r.solution === null ? 'Divergió' : 'No convergió (máx. iter.)'

const fmtRoot = (v: number | null): string => (v === null ? '—' : v.toFixed(8))

const fmtX = (x: number[]): string =>
  x.length === 1 ? (x[0] as number).toPrecision(10) : formatVector(x.length > 0 ? x : null)

const marginText = computed(() => {
  const m = current.value?.roots.marginMonths
  if (m === null || m === undefined) return '—'
  return m >= 0 ? `+${m.toFixed(3)} meses (a tiempo)` : `${m.toFixed(3)} meses (retrasada)`
})

const sensText = computed(() => {
  const s = current.value?.roots.sensitivity
  if (!s) return ''
  if (s.amplification === null || s.shift === null) {
    return 'No se pudo evaluar la sensibilidad (no existe raíz real).'
  }
  const kind = s.amplification > 10 ? 'raíz mal condicionada' : 'raíz bien condicionada'
  return `Si el umbral desciende ${formatSci(s.delta, 1)}, la raíz se desplaza ${formatSci(s.shift)} meses (amplificación ≈ ${formatSci(s.amplification)}, ${kind}).`
})

const curveSeries = computed<ChartSeries[]>(() => {
  const r = run.value
  if (!r) return []
  const p = r.params
  const root = r.data.roots.analyticRoot
  const tmax = Math.max((root ?? 0) * 1.3, p.t_inspeccion * 1.3, 10)
  const N = 120
  const curve = Array.from({ length: N + 1 }, (_, i) => {
    const t = (tmax * i) / N
    return { x: t, y: damage(p, t) }
  })
  const ys = curve.map((c) => c.y)
  const yMin = Math.min(...ys, p.D_umbral)
  const yMax = Math.max(...ys, p.D_umbral)
  const out: ChartSeries[] = [
    { name: 'D(t)', color: '#2563eb', points: curve },
    { name: `Umbral = ${p.D_umbral}`, color: '#dc2626', dashed: true, points: [{ x: 0, y: p.D_umbral }, { x: tmax, y: p.D_umbral }] },
    { name: `Inspección t = ${p.t_inspeccion}`, color: '#d97706', dashed: true, points: [{ x: p.t_inspeccion, y: yMin }, { x: p.t_inspeccion, y: yMax }] },
  ]
  if (root !== null) {
    out.push({ name: `Raíz t* ≈ ${root.toFixed(2)}`, color: '#16a34a', dots: true, points: [{ x: root, y: p.D_umbral }] })
  }
  return out
})

const linearConv = computed<ChartSeries[]>(() =>
  LINEAR_METHODS.filter((m) => m !== 'LU').map((m) => ({
    name: METHOD_LABELS[m],
    color: COLORS[m],
    points: (run.value?.histories[m] ?? []).map((h) => ({ x: h.k, y: h.residual })),
  })),
)

const rootConv = computed<ChartSeries[]>(() =>
  ROOT_METHODS.map((m) => ({
    name: METHOD_LABELS[m],
    color: COLORS[m],
    points: (run.value?.histories[m] ?? [])
      .filter((h) => h.error !== null)
      .map((h) => ({ x: h.k, y: h.error as number })),
  })),
)

const methodsWithHistory = computed<MethodCode[]>(() => {
  const h = run.value?.histories
  if (!h) return []
  return (Object.keys(h) as MethodCode[]).filter((m) => (h[m]?.length ?? 0) > 0)
})

const iterRows = computed(() => run.value?.histories[iterMethod.value] ?? [])
const iterIsRoot = computed(() => ROOT_METHODS.includes(iterMethod.value as RootMethodCode))

watch(
  run,
  () => {
    if (!methodsWithHistory.value.includes(iterMethod.value)) {
      iterMethod.value = methodsWithHistory.value[0] ?? 'JACOBI'
    }
  },
  { immediate: true },
)

onMounted(() => {
  void selectScenario('NORMAL')
  void refreshHistory()
})
</script>

<template>
  <div class="module-page">
    <!-- ── Header ── -->
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
            <div class="code-badge">MÓDULO 02</div>
            <h1 class="page-title">Deterioro Mecánico y Mantenimiento</h1>
            <p class="page-subtitle">Calibración de sistemas lineales SPD (Jacobi, Gauss-Seidel, LU, CG) y estimación de raíces de deterioro D(t)</p>
          </div>
          <div class="header-meta">
            <span class="status-indicator">Prototipo Activo (S1)</span>
          </div>
        </div>

        <!-- ── Main Tabs ── -->
        <nav class="main-tabs" aria-label="Secciones del módulo">
          <button class="tab-btn" :class="{ 'is-active': tab === 'sim' }" @click="tab = 'sim'">
            Simulador Numérico
          </button>
          <button class="tab-btn" :class="{ 'is-active': tab === 'hist' }" @click="tab = 'hist'; refreshHistory()">
            Historial de Persistencia ({{ sims.length }})
          </button>
        </nav>
      </div>
    </header>

    <!-- ── Main Container ── -->
    <main class="module-main">
      <!-- ── Global Messages ── -->
      <div v-if="error" class="alert-banner alert-error" role="alert">
        <span class="alert-title">Error:</span>
        <span class="alert-text">{{ error }}</span>
      </div>
      <div v-if="message" class="alert-banner alert-success" role="status">
        <span class="alert-text">{{ message }}</span>
      </div>

      <!-- ============================ TAB: SIMULADOR ============================ -->
      <template v-if="tab === 'sim'">
        <!-- ── Scenario Bar ── -->
        <section class="control-bar" aria-label="Selector de Escenario">
          <div class="scenario-group">
            <span class="control-label">Escenario Sintético:</span>
            <div class="scenario-buttons">
              <button
                v-for="s in scenarios"
                :key="s.type"
                class="scenario-pill"
                :class="{ 'is-active': selected === s.type }"
                @click="chooseScenario(s.type)"
              >
                {{ s.label }}
              </button>
            </div>
          </div>
          <div v-if="info" class="equation-tag">
            <span class="eq-label">Fuente:</span>
            <span class="eq-text">{{ info.fuente }}</span>
          </div>
        </section>

        <div v-if="loading && !form" class="card loading-card">
          <p class="loading-text">Cargando escenario numérico...</p>
        </div>

        <!-- ── Parameters Card ── -->
        <section v-if="form" class="card form-card">
          <div class="card-header">
            <h2 class="card-title">Parámetros del Sistema y Métodos</h2>
            <span class="card-caption">Calibración de coeficientes de deterioro y parámetros de tolerancia</span>
          </div>

          <div class="card-body">
            <div v-for="g in fieldGroups" :key="g.title" class="param-group">
              <h3 class="param-group-title">{{ g.title }}</h3>
              <div class="fields-grid">
                <div v-for="f in g.fields" :key="f.key" class="field-item">
                  <label :for="`f-${f.key}`" class="field-label">{{ f.label }}</label>
                  <input
                    :id="`f-${f.key}`"
                    v-model.number="form[f.key]"
                    type="number"
                    step="any"
                    class="field-input"
                  />
                  <span class="field-hint">{{ f.hint }}</span>
                </div>
              </div>
            </div>

            <div v-if="problems.length > 0" class="alert-banner alert-error" role="alert">
              <span class="alert-title">Validación requerida:</span>
              <ul class="problems-list">
                <li v-for="p in problems" :key="p">{{ p }}</li>
              </ul>
            </div>

            <div class="form-actions">
              <button class="primary-btn" :disabled="problems.length > 0" @click="compute">
                Calcular Simulación
              </button>
              <button class="secondary-btn" @click="resetParams">
                Restablecer Valores del Escenario
              </button>
            </div>
          </div>
        </section>

        <!-- ── Persistence Actions Card ── -->
        <section v-if="run" class="card persistence-card">
          <div class="card-header">
            <h2 class="card-title">Almacenamiento en Base de Datos (PostgreSQL)</h2>
            <span class="card-caption">Registro de resultados para auditoría y reproducibilidad</span>
          </div>
          <div class="card-body">
            <div class="persistence-form">
              <div class="persistence-inputs">
                <input
                  v-model="label"
                  type="text"
                  maxlength="150"
                  placeholder="Etiqueta (ej.: Prueba inspección 1)"
                  class="field-input"
                  aria-label="Etiqueta"
                />
                <input
                  v-model="equipo"
                  type="text"
                  maxlength="100"
                  placeholder="Equipo / Investigador (opcional)"
                  class="field-input"
                  aria-label="Equipo"
                />
              </div>
              <div class="persistence-buttons">
                <button class="primary-btn" :disabled="busy || dirty" @click="saveNew">
                  Guardar como Nueva
                </button>
                <button v-if="editingId !== null" class="secondary-btn" :disabled="busy || dirty" @click="overwrite">
                  Actualizar Simulación #{{ editingId }}
                </button>
              </div>
            </div>
            <p v-if="dirty" class="warning-text">Se modificaron parámetros: presione "Calcular Simulación" antes de guardar.</p>
          </div>
        </section>

        <!-- ── Results Section ── -->
        <template v-if="current && run">
          <div v-if="banner" class="status-banner" role="status">
            {{ banner }}
          </div>

          <!-- ── Condition & System Overview ── -->
          <section class="card overview-card">
            <div class="card-header">
              <div>
                <h2 class="card-title">{{ current.title }}</h2>
                <p class="card-subtitle-text">{{ current.description }}</p>
              </div>
            </div>
            <div class="card-body">
              <div class="metrics-strip">
                <div class="strip-item">
                  <span class="strip-label">Número de Condición κ₂(A):</span>
                  <span class="strip-value font-mono">{{ current.conditionNumber === null ? '—' : current.conditionNumber.toPrecision(6) }}</span>
                </div>
                <div class="strip-item">
                  <span class="strip-label">Tolerancia ε:</span>
                  <span class="strip-value font-mono">{{ formatSci(current.tolerance, 1) }}</span>
                </div>
                <div class="strip-item">
                  <span class="strip-label">Máx. Iteraciones:</span>
                  <span class="strip-value font-mono">{{ current.maxIterations }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Roots Analysis Card ── -->
          <section class="card table-card">
            <div class="card-header">
              <div>
                <h2 class="card-title">Raíces: Instante en que D(t) alcanza el umbral de falla</h2>
                <span class="card-caption">Comparación entre métodos cerrados y abiertos para f(t) = D(t) - D_umbral</span>
              </div>
            </div>
            <div class="card-body">
              <div class="metrics-strip mb-3">
                <div class="strip-item">
                  <span class="strip-label">Raíz analítica t*:</span>
                  <span class="strip-value font-mono">
                    {{ current.roots.analyticRoot === null ? 'No existe (t ≥ 0)' : `${current.roots.analyticRoot.toFixed(8)} meses` }}
                  </span>
                </div>
                <div class="strip-item">
                  <span class="strip-label">Discriminante Δ:</span>
                  <span class="strip-value font-mono">{{ formatSci(current.roots.discriminant, 3) }}</span>
                </div>
                <div class="strip-item">
                  <span class="strip-label">D(t inspección):</span>
                  <span class="strip-value font-mono">{{ current.roots.dAtInspection.toFixed(4) }}</span>
                </div>
                <div class="strip-item">
                  <span class="strip-label">Margen t* − t_insp:</span>
                  <span class="strip-value font-mono">{{ marginText }}</span>
                </div>
              </div>

              <p class="sensitivity-notice">{{ sensText }}</p>

              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Método</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Iteraciones</th>
                      <th scope="col">Raíz Calculada (t)</th>
                      <th scope="col">|f(raíz)|</th>
                      <th scope="col">Error Abs.</th>
                      <th scope="col">Error Rel.</th>
                      <th scope="col">Error %</th>
                      <th scope="col">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in current.roots.results" :key="r.method">
                      <td class="font-medium">{{ METHOD_LABELS[r.method] }}</td>
                      <td>
                        <span class="status-badge-inline" :class="r.converged ? 'is-success' : 'is-warning'">
                          {{ r.converged ? 'Convergió' : 'No convergió' }}
                        </span>
                      </td>
                      <td class="tabular-num">{{ r.iterations }}</td>
                      <td class="tabular-num font-mono">{{ fmtRoot(r.root) }}</td>
                      <td class="tabular-num">{{ r.fRoot === null ? '—' : formatSci(Math.abs(r.fRoot)) }}</td>
                      <td class="tabular-num">{{ formatSci(r.absoluteError) }}</td>
                      <td class="tabular-num">{{ formatSci(r.relativeError) }}</td>
                      <td class="tabular-num">{{ formatPercent(r.percentageError) }}</td>
                      <td class="text-muted text-xs">{{ r.converged ? '—' : r.note }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- ── Linear System A·x = b ── -->
          <section class="card table-card">
            <div class="card-header">
              <h2 class="card-title">Sistema Lineal A·x = b (Calibración de Rigidez)</h2>
              <span class="card-caption">Matrices simétricas y definidas positivas (SPD)</span>
            </div>
            <div class="card-body">
              <div class="table-container mb-4">
                <table class="data-table matrix-table">
                  <thead>
                    <tr>
                      <th :colspan="current.matrixA.length" class="text-center">Matriz A</th>
                      <th class="text-center">Vector b</th>
                      <th class="text-center">x* (Solución Referencia)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in current.matrixA" :key="i">
                      <td v-for="(a, j) in row" :key="j" class="tabular-num text-center">{{ a.toFixed(4) }}</td>
                      <td class="tabular-num text-center bg-subtle">{{ current.vectorB[i]?.toFixed(4) }}</td>
                      <td class="tabular-num text-center bg-subtle font-mono">{{ current.exactSolution[i]?.toFixed(6) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Método</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Iteraciones</th>
                      <th scope="col">Solución x⁽ᵏ⁾</th>
                      <th scope="col">Residual ‖r‖₂</th>
                      <th scope="col">Error Absoluto</th>
                      <th scope="col">Error Relativo</th>
                      <th scope="col">Error %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in current.results" :key="row.method">
                      <td class="font-medium">{{ METHOD_LABELS[row.method] }}</td>
                      <td>
                        <span class="status-badge-inline" :class="row.converged ? 'is-success' : 'is-warning'">
                          {{ statusOf(row) }}
                        </span>
                      </td>
                      <td class="tabular-num">{{ row.iterations }}</td>
                      <td class="tabular-num font-mono">{{ formatVector(row.solution) }}</td>
                      <td class="tabular-num">{{ formatSci(row.residualNorm) }}</td>
                      <td class="tabular-num">{{ formatSci(row.absoluteError) }}</td>
                      <td class="tabular-num">{{ formatSci(row.relativeError) }}</td>
                      <td class="tabular-num">{{ formatPercent(row.percentageError) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- ── Charts Grid ── -->
          <section class="charts-section" aria-label="Gráficos de Convergencia">
            <div class="charts-grid-3">
              <div class="chart-box">
                <LineChart
                  title="Deterioro D(t), Umbral e Inspección"
                  :series="curveSeries"
                  x-label="t (meses)"
                  y-label="D(t)"
                />
              </div>
              <div class="chart-box">
                <LineChart
                  title="Convergencia de Métodos Lineales"
                  :series="linearConv"
                  x-label="Iteración k (log)"
                  y-label="‖b − Ax‖₂ (log)"
                  log-x
                  log-y
                />
              </div>
              <div class="chart-box">
                <LineChart
                  title="Convergencia de Raíces (|x_k − t*|)"
                  :series="rootConv"
                  x-label="Iteración k"
                  y-label="Error absoluto (log)"
                  log-y
                />
              </div>
            </div>
          </section>

          <!-- ── Iteration Log Table ── -->
          <section class="card table-card">
            <div class="card-header">
              <div>
                <h2 class="card-title">Registro Detallado de Iteraciones</h2>
                <span class="card-caption">Traza paso a paso del vector de aproximación y reducción del residual</span>
              </div>
              <div class="method-selector">
                <label for="m2-iter-sel" class="selector-label">Método:</label>
                <select id="m2-iter-sel" v-model="iterMethod" class="field-select">
                  <option v-for="m in methodsWithHistory" :key="m" :value="m">{{ METHOD_LABELS[m] }}</option>
                </select>
              </div>
            </div>
            <div class="card-body">
              <p v-if="iterRows.length === 0" class="empty-notice">Este método no registró iteraciones almacenables.</p>
              <div v-else class="table-container scrollable-table">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th scope="col">k</th>
                      <th scope="col">{{ iterIsRoot ? 'x_k' : 'x⁽ᵏ⁾' }}</th>
                      <th v-if="iterIsRoot" scope="col">f(x_k)</th>
                      <th scope="col">{{ iterIsRoot ? '|f(x_k)|' : 'Residual ‖r‖₂' }}</th>
                      <th scope="col">Error Absoluto</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="h in iterRows" :key="h.k">
                      <td class="tabular-num font-bold">{{ h.k }}</td>
                      <td class="tabular-num font-mono">{{ fmtX(h.x) }}</td>
                      <td v-if="iterIsRoot" class="tabular-num">{{ formatSci(h.fx) }}</td>
                      <td class="tabular-num">{{ formatSci(h.residual) }}</td>
                      <td class="tabular-num">{{ formatSci(h.error) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="table-footnote">Nota: Si el método excede 1000 iteraciones, se presentan 1000 muestras equiespaciadas incluyendo la condición final.</p>
            </div>
          </section>

          <!-- ── Conclusions ── -->
          <section class="conclusions-grid" aria-label="Conclusiones Técnicas">
            <div class="conclusion-card conclusion-numeric">
              <div class="conclusion-badge">Análisis Matricial</div>
              <h3 class="conclusion-title">Conclusión Numérica</h3>
              <p class="conclusion-text">{{ current.numericalConclusion }}</p>
            </div>

            <div class="conclusion-card conclusion-phenomenon">
              <div class="conclusion-badge">Ingeniería de Mantenimiento</div>
              <h3 class="conclusion-title">Conclusión del Problema</h3>
              <p class="conclusion-text">{{ current.problemConclusion }}</p>
            </div>
          </section>
        </template>
      </template>

      <!-- ============================ TAB: HISTORIAL ============================ -->
      <section v-else class="card history-card" aria-label="Historial de Simulaciones">
        <div class="card-header">
          <div>
            <h2 class="card-title">Simulaciones Persistidas — Módulo 2</h2>
            <span class="card-caption">Registro de corridas y verificación de consistencia en PostgreSQL</span>
          </div>
          <form class="history-search" @submit.prevent="refreshHistory">
            <input
              v-model="search"
              type="search"
              placeholder="Buscar por etiqueta..."
              class="field-input search-input"
            />
            <button class="secondary-btn" type="submit">Buscar</button>
          </form>
        </div>

        <div class="card-body">
          <div v-if="sims.length === 0" class="empty-state">
            <p class="empty-title">No hay simulaciones registradas</p>
            <p class="empty-text">Calcule una corrida en el simulador y presione "Guardar como Nueva".</p>
          </div>

          <div v-else class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Etiqueta</th>
                  <th scope="col">Equipo</th>
                  <th scope="col">Escenario</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Fecha</th>
                  <th scope="col" class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in sims" :key="s.id">
                  <td class="tabular-num font-mono">#{{ s.id }}</td>
                  <td>
                    <input
                      v-if="editing.id === s.id"
                      v-model="editing.label"
                      type="text"
                      maxlength="150"
                      class="field-input inline-edit-input"
                    />
                    <span v-else class="font-medium">{{ s.etiqueta ?? '—' }}</span>
                  </td>
                  <td>
                    <input
                      v-if="editing.id === s.id"
                      v-model="editing.equipo"
                      type="text"
                      maxlength="100"
                      class="field-input inline-edit-input"
                    />
                    <span v-else class="text-muted">{{ s.equipo ?? '—' }}</span>
                  </td>
                  <td>
                    <span class="scenario-tag">{{ TIPO_LABEL[s.tipo] }}</span>
                  </td>
                  <td>
                    <span class="status-badge-inline">{{ s.estado }}</span>
                  </td>
                  <td class="text-muted text-xs tabular-num">{{ fmtDate(s.creadoEn) }}</td>
                  <td class="text-right">
                    <div class="action-buttons">
                      <template v-if="editing.id === s.id">
                        <button class="action-btn action-open" :disabled="busy" @click="saveRename">Guardar</button>
                        <button class="action-btn action-relaunch" @click="editing.id = null">Cancelar</button>
                      </template>
                      <template v-else>
                        <button class="action-btn action-open" :disabled="busy" @click="openSaved(s.id)">Abrir</button>
                        <button class="action-btn action-relaunch" :disabled="busy" @click="relaunch(s.id)">Verificar</button>
                        <button class="action-btn action-edit" @click="startRename(s)">Renombrar</button>
                        <button class="action-btn action-delete" :disabled="busy" @click="removeSim(s.id)">Eliminar</button>
                      </template>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ── Reproducibility Verification Report ── -->
      <section v-if="verification" class="card verification-card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Reporte de Reproducibilidad — Simulación #{{ verification.id }}</h2>
            <span class="card-caption">Contraste entre valores almacenados y recálculo numérico en memoria</span>
          </div>
          <span
            class="status-badge-inline"
            :class="verification.report.ok ? 'is-success' : 'is-warning'"
          >
            {{ verification.report.ok ? 'Consistencia Verificada' : 'Diferencias Detectadas' }}
          </span>
        </div>
        <div class="card-body">
          <p class="verification-lead" :class="verification.report.ok ? 'text-success' : 'text-danger'">
            {{ verification.report.ok
              ? `Todos los resultados recalculados coinciden con los guardados (tolerancia ε = ${formatSci(verification.report.tolerance, 1)}).`
              : 'Se detectaron discrepancias entre los valores almacenados y los resultados recalculados.'
            }}
          </p>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Método</th>
                  <th scope="col">Iter. Guardadas</th>
                  <th scope="col">Iter. Recalculadas</th>
                  <th scope="col">Diferencia Máx. Solución</th>
                  <th scope="col">Dictamen</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in verification.report.rows" :key="r.method">
                  <td class="font-medium">{{ METHOD_LABELS[r.method] }}</td>
                  <td class="tabular-num">{{ r.iterationsStored }}</td>
                  <td class="tabular-num">{{ r.iterationsFresh ?? '—' }}</td>
                  <td class="tabular-num font-mono">{{ r.maxDiff === null ? '—' : formatSci(r.maxDiff) }}</td>
                  <td>
                    <span class="status-badge-inline" :class="r.ok ? 'is-success' : 'is-warning'">
                      {{ r.ok ? 'Coincide' : 'Difiere' }}
                    </span>
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
  color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.25);
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
.eq-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #334155;
  font-size: 0.75rem;
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
  flex-wrap: wrap;
  gap: 0.5rem;
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
.card-subtitle-text {
  font-size: 0.825rem;
  color: #475569;
  margin: 0.25rem 0 0;
}

/* ── Parameters Group ── */
.param-group {
  margin-bottom: 1.25rem;
}
.param-group:last-of-type {
  margin-bottom: 1.5rem;
}
.param-group-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e3a8a;
  margin: 0 0 0.75rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid #f1f5f9;
}
.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 1rem;
}
.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
}
.field-input,
.field-select {
  padding: 0.5rem 0.65rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  font-size: 0.85rem;
  font-family: inherit;
  color: #0f172a;
  background-color: #ffffff;
  transition: all 0.15s ease;
}
.field-input:focus,
.field-select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.field-hint {
  font-size: 0.7rem;
  color: #94a3b8;
}
.form-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.problems-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
}

/* ── Metrics Strip ── */
.metrics-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem 2rem;
  padding: 0.75rem 1rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}
.strip-item {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}
.strip-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}
.strip-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
}
.mb-3 {
  margin-bottom: 0.85rem;
}
.mb-4 {
  margin-bottom: 1.25rem;
}

/* ── Sensitivity Notice ── */
.sensitivity-notice {
  font-size: 0.825rem;
  color: #475569;
  background-color: #f1f5f9;
  border-left: 3px solid #3b82f6;
  padding: 0.5rem 0.75rem;
  margin: 0 0 1rem;
  border-radius: 0 4px 4px 0;
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
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid #e2e8f0;
}
.data-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}
.data-table tr:hover td {
  background-color: #f8fafc;
}
.matrix-table td {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
}
.text-center {
  text-align: center;
}
.bg-subtle {
  background-color: #f8fafc;
}
.tabular-num {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.font-medium {
  font-weight: 600;
  color: #0f172a;
}
.font-bold {
  font-weight: 700;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.text-muted {
  color: #64748b;
}
.text-xs {
  font-size: 0.75rem;
}
.text-right {
  text-align: right;
}
.text-success {
  color: #166534;
}
.text-danger {
  color: #991b1b;
}

.scrollable-table {
  max-height: 340px;
  overflow-y: auto;
}
.table-footnote {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0.75rem 0 0;
}

/* ── Charts Grid 3-col ── */
.charts-grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 1.25rem;
}
.chart-box {
  min-width: 0;
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

/* ── Buttons ── */
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
  padding: 0.55rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.secondary-btn:hover:not(:disabled) {
  background-color: #f8fafc;
  border-color: #94a3b8;
}

/* ── Status Banners ── */
.status-banner {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  border-radius: 6px;
  padding: 0.65rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
}
.alert-banner {
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
.warning-text {
  font-size: 0.8rem;
  color: #b45309;
  margin: 0.5rem 0 0;
}

/* ── Persistence Form ── */
.persistence-form {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.persistence-inputs {
  display: flex;
  gap: 0.75rem;
  flex: 1;
  min-width: 280px;
}
.persistence-buttons {
  display: flex;
  gap: 0.5rem;
}

/* ── Method Selector ── */
.method-selector {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.selector-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
}

/* ── History Search ── */
.history-search {
  display: flex;
  gap: 0.5rem;
}
.search-input {
  width: 240px;
}
.inline-edit-input {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  width: 100%;
}

/* ── Status Badges & Action Buttons ── */
.status-badge-inline {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  background-color: #f1f5f9;
  color: #475569;
}
.status-badge-inline.is-success {
  background-color: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}
.status-badge-inline.is-warning {
  background-color: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
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
.action-buttons {
  display: flex;
  gap: 0.35rem;
  justify-content: flex-end;
  flex-wrap: wrap;
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
.action-relaunch {
  background-color: #f8fafc;
  color: #334155;
  border-color: #e2e8f0;
}
.action-edit {
  background-color: #f1f5f9;
  color: #475569;
  border-color: #cbd5e1;
}
.action-delete {
  background-color: #fef2f2;
  color: #b91c1c;
  border-color: #fee2e2;
}

/* ── Empty State ── */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
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
.empty-notice {
  font-size: 0.825rem;
  color: #64748b;
  text-align: center;
  padding: 1.5rem 0;
}

/* ── Responsive ── */
@media (max-width: 960px) {
  .conclusions-grid {
    grid-template-columns: 1fr;
  }
  .persistence-form {
    flex-direction: column;
    align-items: stretch;
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
  .persistence-inputs {
    flex-direction: column;
  }
}
</style>
