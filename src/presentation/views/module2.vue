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
    title: 'Modelo de deterioro D(t) = D₀ + α·t + β·t²',
    fields: [
      { key: 'D0', label: 'D₀', hint: 'Indicador inicial (≥ 0)' },
      { key: 'alpha', label: 'α', hint: 'Tasa lineal (≥ 0), 1/mes' },
      { key: 'beta', label: 'β', hint: 'Término cuadrático, 1/mes²' },
      { key: 'D_umbral', label: 'D umbral', hint: 'Debe ser > D₀' },
      { key: 't_inspeccion', label: 't inspección', hint: 'Meses programados' },
    ],
  },
  {
    title: 'Raíces: D(t) − D_umbral = 0',
    fields: [
      { key: 'a', label: 'a (bisección)', hint: 'Extremo izquierdo ≥ 0' },
      { key: 'b', label: 'b (bisección)', hint: 'Extremo derecho > a' },
      { key: 'x0', label: 'x₀ (Newton)', hint: 'Semilla' },
      { key: 's0', label: 's₀ (secante)', hint: 'Primera semilla' },
      { key: 's1', label: 's₁ (secante)', hint: 'Segunda semilla' },
    ],
  },
  {
    title: 'Sistema lineal y control numérico',
    fields: [
      { key: 'perturbacion_b1', label: 'Perturbación de b₁', hint: 'Fracción, ej. 0.05 = +5 %' },
      { key: 'tolerancia', label: 'Tolerancia', hint: 'Entre 0 y 1, ej. 1e-6' },
      { key: 'max_iter', label: 'Máx. iteraciones', hint: 'Entero 1 a 100000' },
    ],
  },
]

const scenarios: { type: ScenarioType; label: string }[] = [
  { type: 'NORMAL', label: 'NORMAL' },
  { type: 'ESTRES', label: 'ESTRÉS' },
  { type: 'MAL_CONDICIONADO', label: 'MAL CONDICIONADO' },
]

const TIPO_LABEL: Record<ScenarioType, string> = {
  NORMAL: 'Normal',
  ESTRES: 'Estrés',
  MAL_CONDICIONADO: 'Mal condicionado',
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
        ? 'Cálculo nuevo (aún no guardado)'
        : `Recalculado a partir de la simulación #${editingId.value} (cambios sin guardar)`
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

// CREATE
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
    message.value = `Simulación guardada con id #${id}`
    await refreshHistory()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

// UPDATE (sobrescribe resultados y parámetros de la simulación abierta)
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
    message.value = `Simulación #${id} actualizada`
    await refreshHistory()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

// READ
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

// Relanzar + verificar coincidencia con lo guardado
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

// UPDATE (solo nombre y equipo)
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
    message.value = `Simulación #${id} renombrada`
    await refreshHistory()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

// DELETE
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
    return 'No se pudo evaluar la sensibilidad (no existe raíz).'
  }
  const kind = s.amplification > 10 ? 'raíz mal condicionada' : 'raíz bien condicionada'
  return `Si el umbral baja ${formatSci(s.delta, 1)}, la raíz se desplaza ${formatSci(s.shift)} meses: amplificación ≈ ${formatSci(s.amplification)} (${kind}).`
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
  <main class="container">
    <div class="top-bar">
      <button class="btn-back" @click="router.push('/')">← Volver</button>
    </div>
    <h2>Módulo 2: Deterioro Mecánico y Mantenimiento</h2>
    <p class="note">Datos sintéticos con fines educativos; sin conexión con equipos reales.</p>

    <nav class="tabs">
      <button :class="{ active: tab === 'sim' }" @click="tab = 'sim'">Simulador</button>
      <button :class="{ active: tab === 'hist' }" @click="tab = 'hist'; refreshHistory()">
        Historial ({{ sims.length }})
      </button>
    </nav>

    <p v-if="error" class="error">Error: {{ error }}</p>
    <p v-if="message" class="success">{{ message }}</p>

    <!-- ============================ SIMULADOR ============================ -->
    <section v-if="tab === 'sim'">
      <div class="btn-group">
        <button v-for="s in scenarios" :key="s.type" :class="{ active: selected === s.type }"
          @click="chooseScenario(s.type)">
          {{ s.label }}
        </button>
      </div>

      <p v-if="loading && !form">Cargando escenario…</p>

      <div v-if="form" class="panel">
        <h3>Parámetros</h3>
        <p v-if="info" class="muted">Fuente: {{ info.fuente }}</p>

        <div v-for="g in fieldGroups" :key="g.title" class="group">
          <h4>{{ g.title }}</h4>
          <div class="fields">
            <label v-for="f in g.fields" :key="f.key" class="field">
              <span>{{ f.label }}</span>
              <input v-model.number="form[f.key]" type="number" step="any" />
              <small>{{ f.hint }}</small>
            </label>
          </div>
        </div>

        <ul v-if="problems.length > 0" class="problems">
          <li v-for="p in problems" :key="p">{{ p }}</li>
        </ul>

        <div class="actions">
          <button class="primary" :disabled="problems.length > 0" @click="compute">Calcular</button>
          <button class="secondary" @click="resetParams">Restablecer valores del escenario</button>
        </div>
      </div>

      <div v-if="run" class="panel">
        <h3>Guardar en la base de datos</h3>
        <div class="fields two">
          <label class="field">
            <span>Etiqueta</span>
            <input v-model="label" type="text" maxlength="150" placeholder="Ej.: Prueba inspección 1" />
          </label>
          <label class="field">
            <span>Equipo (opcional)</span>
            <input v-model="equipo" type="text" maxlength="100" placeholder="Ej.: Grupo 3" />
          </label>
        </div>
        <p v-if="dirty" class="warn">Cambiaste parámetros: pulsa «Calcular» antes de guardar.</p>
        <div class="actions">
          <button class="primary" :disabled="busy || dirty" @click="saveNew">Guardar como nueva</button>
          <button v-if="editingId !== null" class="secondary" :disabled="busy || dirty" @click="overwrite">
            Actualizar simulación #{{ editingId }}
          </button>
        </div>
      </div>
    </section>

    <!-- ============================ HISTORIAL ============================ -->
    <section v-else class="panel">
      <h3>Simulaciones guardadas</h3>
      <form class="search" @submit.prevent="refreshHistory">
        <input v-model="search" type="search" placeholder="Buscar por etiqueta…" />
        <button class="secondary" type="submit">Buscar</button>
      </form>

      <p v-if="sims.length === 0" class="muted">No hay simulaciones guardadas.</p>

      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Etiqueta</th>
              <th>Equipo</th>
              <th>Escenario</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sims" :key="s.id">
              <td>#{{ s.id }}</td>
              <td>
                <input v-if="editing.id === s.id" v-model="editing.label" type="text" maxlength="150" />
                <span v-else>{{ s.etiqueta ?? '—' }}</span>
              </td>
              <td>
                <input v-if="editing.id === s.id" v-model="editing.equipo" type="text" maxlength="100" />
                <span v-else>{{ s.equipo ?? '—' }}</span>
              </td>
              <td>{{ TIPO_LABEL[s.tipo] }}</td>
              <td>{{ s.estado }}</td>
              <td>{{ fmtDate(s.creadoEn) }}</td>
              <td class="row-actions">
                <template v-if="editing.id === s.id">
                  <button class="small" :disabled="busy" @click="saveRename">Guardar</button>
                  <button class="small" @click="editing.id = null">Cancelar</button>
                </template>
                <template v-else>
                  <button class="small" :disabled="busy" @click="openSaved(s.id)">Abrir</button>
                  <button class="small" :disabled="busy" @click="relaunch(s.id)">Relanzar y verificar</button>
                  <button class="small" @click="startRename(s)">Renombrar</button>
                  <button class="small danger" :disabled="busy" @click="removeSim(s.id)">Eliminar</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ===================== VERIFICACIÓN DE REPRODUCIBILIDAD ===================== -->
    <section v-if="verification" class="panel">
      <h3>Verificación de reproducibilidad — simulación #{{ verification.id }}</h3>
      <p :class="verification.report.ok ? 'success' : 'error'">
        {{
          verification.report.ok
            ? `Los resultados recalculados coinciden con los guardados (tolerancia
        ${formatSci(verification.report.tolerance,
              1)}).`
            : 'Hay diferencias entre lo guardado y lo recalculado.'
        }}
      </p>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Método</th>
              <th>Iter. guardadas</th>
              <th>Iter. recalculadas</th>
              <th>Diferencia máx. en la solución</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in verification.report.rows" :key="r.method">
              <td>{{ METHOD_LABELS[r.method] }}</td>
              <td>{{ r.iterationsStored }}</td>
              <td>{{ r.iterationsFresh ?? '—' }}</td>
              <td>{{ r.maxDiff === null ? '—' : formatSci(r.maxDiff) }}</td>
              <td>{{ r.ok ? '✔ coincide' : '✘ difiere' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ================================ RESULTADOS ================================ -->
    <template v-if="current && run">
      <p v-if="banner" class="banner">{{ banner }}</p>

      <section class="panel">
        <h3>{{ current.title }}</h3>
        <p>{{ current.description }}</p>
        <div class="metrics-bar">
          <span>
            <strong>κ₂(A):</strong>
            {{ current.conditionNumber === null ? '—' : current.conditionNumber.toPrecision(6) }}
          </span>
          <span><strong>Tolerancia:</strong> {{ formatSci(current.tolerance, 1) }}</span>
          <span><strong>Máx. iteraciones:</strong> {{ current.maxIterations }}</span>
        </div>
      </section>

      <section class="panel">
        <h3>Raíces: instante en que D(t) alcanza el umbral</h3>
        <div class="metrics-bar">
          <span>
            <strong>Raíz analítica t*:</strong>
            {{ current.roots.analyticRoot === null ? 'no existe (t ≥ 0)' : current.roots.analyticRoot.toFixed(8) +
            'meses' }}
          </span>
          <span><strong>Discriminante:</strong> {{ formatSci(current.roots.discriminant, 3) }}</span>
          <span><strong>D(t inspección):</strong> {{ current.roots.dAtInspection.toFixed(4) }}</span>
          <span><strong>Margen t* − t_insp:</strong> {{ marginText }}</span>
        </div>
        <p class="sens">{{ sensText }}</p>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Método</th>
                <th>Estado</th>
                <th>Iteraciones</th>
                <th>Raíz</th>
                <th>|f(raíz)|</th>
                <th>Error abs.</th>
                <th>Error rel.</th>
                <th>Error %</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in current.roots.results" :key="r.method">
                <td><strong>{{ METHOD_LABELS[r.method] }}</strong></td>
                <td>{{ r.converged ? 'Convergió' : 'No convergió' }}</td>
                <td>{{ r.iterations }}</td>
                <td>{{ fmtRoot(r.root) }}</td>
                <td>{{ r.fRoot === null ? '—' : formatSci(Math.abs(r.fRoot)) }}</td>
                <td>{{ formatSci(r.absoluteError) }}</td>
                <td>{{ formatSci(r.relativeError) }}</td>
                <td>{{ formatPercent(r.percentageError) }}</td>
                <td class="nota">{{ r.converged ? '' : r.note }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h3>Sistema lineal A·x = b (calibración)</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th :colspan="current.matrixA.length">A</th>
                <th>b</th>
                <th>x* (referencia)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in current.matrixA" :key="i">
                <td v-for="(a, j) in row" :key="j">{{ a.toFixed(4) }}</td>
                <td>{{ current.vectorB[i]?.toFixed(4) }}</td>
                <td>{{ current.exactSolution[i]?.toFixed(6) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-wrapper spaced">
          <table>
            <thead>
              <tr>
                <th>Método</th>
                <th>Estado</th>
                <th>Iteraciones</th>
                <th>Solución x⁽ᵏ⁾</th>
                <th>Residual ‖r‖₂</th>
                <th>Error abs.</th>
                <th>Error rel.</th>
                <th>Error %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in current.results" :key="row.method">
                <td><strong>{{ METHOD_LABELS[row.method] }}</strong></td>
                <td>{{ statusOf(row) }}</td>
                <td>{{ row.iterations }}</td>
                <td>{{ formatVector(row.solution) }}</td>
                <td>{{ formatSci(row.residualNorm) }}</td>
                <td>{{ formatSci(row.absoluteError) }}</td>
                <td>{{ formatSci(row.relativeError) }}</td>
                <td>{{ formatPercent(row.percentageError) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h3>Gráficos</h3>
        <div class="charts">
          <LineChart title="Escenario: D(t), umbral e inspección" :series="curveSeries" x-label="t (meses)"
            y-label="D(t)" />
          <LineChart title="Convergencia de los iterativos lineales (residual)" :series="linearConv"
            x-label="iteración k (log)" y-label="‖b − Ax‖₂ (log)" log-x log-y />
          <LineChart title="Convergencia de las raíces (error absoluto vs t*)" :series="rootConv" x-label="iteración k"
            y-label="|x_k − t*| (log)" log-y />
        </div>
      </section>

      <section class="panel">
        <h3>Tabla de iteraciones</h3>
        <label class="inline">
          Método:
          <select v-model="iterMethod">
            <option v-for="m in methodsWithHistory" :key="m" :value="m">{{ METHOD_LABELS[m] }}</option>
          </select>
        </label>
        <p v-if="iterRows.length === 0" class="muted">Este método no registró iteraciones.</p>
        <div v-else class="table-wrapper scroll">
          <table>
            <thead>
              <tr>
                <th>k</th>
                <th>{{ iterIsRoot ? 'x_k' : 'x⁽ᵏ⁾' }}</th>
                <th v-if="iterIsRoot">f(x_k)</th>
                <th>{{ iterIsRoot ? '|f(x_k)|' : 'Residual ‖r‖₂' }}</th>
                <th>Error abs.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in iterRows" :key="h.k">
                <td>{{ h.k }}</td>
                <td>{{ fmtX(h.x) }}</td>
                <td v-if="iterIsRoot">{{ formatSci(h.fx) }}</td>
                <td>{{ formatSci(h.residual) }}</td>
                <td>{{ formatSci(h.error) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="muted">Si un método supera 1000 iteraciones, se guardan 1000 filas equiespaciadas (incluida la
          última).</p>
      </section>

      <section class="conclusions">
        <div class="panel">
          <h4>Conclusión numérica</h4>
          <p>{{ current.numericalConclusion }}</p>
        </div>
        <div class="panel">
          <h4>Conclusión del problema</h4>
          <p>{{ current.problemConclusion }}</p>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, sans-serif;
  color: #1e293b;
}

.top-bar {
  margin-bottom: 1rem;
}

.btn-back {
  background: transparent;
  border: 1px solid #cbd5e1;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
}

.note,
.muted {
  color: #64748b;
  font-size: 0.85rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
  border-bottom: 2px solid #e2e8f0;
}

.tabs button {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  color: #475569;
  border-bottom: 3px solid transparent;
}

.tabs button.active {
  color: #0f172a;
  border-bottom-color: #0f172a;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.btn-group button {
  padding: 0.5rem 1rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.btn-group button.active {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}

.panel {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  background: #fff;
}

.panel h3,
.panel h4 {
  margin-top: 0;
  font-size: 1.1rem;
}

.group {
  margin-bottom: 1rem;
}

.group h4 {
  margin: 0.5rem 0;
  font-size: 0.95rem;
  color: #334155;
}

.fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.75rem;
}

.fields.two {
  grid-template-columns: 1fr 1fr;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.85rem;
}

.field span {
  font-weight: 600;
}

.field input,
.search input,
select,
td input {
  padding: 0.4rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font: inherit;
}

.field small {
  color: #64748b;
  font-size: 0.75rem;
}

.problems {
  color: #b91c1c;
  font-size: 0.85rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 0.5rem 1.5rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.primary,
.secondary,
.small {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #0f172a;
}

.primary {
  background: #0f172a;
  color: #fff;
}

.secondary,
.small {
  background: #fff;
  color: #0f172a;
}

.small {
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
  border-color: #cbd5e1;
}

.danger {
  color: #b91c1c;
  border-color: #fecaca;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.search input {
  flex: 1;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
  border-radius: 6px;
  padding: 0.6rem 0.9rem;
  font-size: 0.9rem;
}

.metrics-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 2rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
  font-size: 0.9rem;
}

.sens {
  font-size: 0.88rem;
  color: #334155;
}

.table-wrapper {
  overflow-x: auto;
}

.table-wrapper.spaced {
  margin-top: 1rem;
}

.table-wrapper.scroll {
  max-height: 320px;
  overflow-y: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th,
td {
  border: 1px solid #cbd5e1;
  padding: 0.5rem;
  text-align: left;
}

th {
  background: #f1f5f9;
  position: sticky;
  top: 0;
}

.nota {
  max-width: 260px;
  font-size: 0.78rem;
  color: #475569;
}

.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 1.5rem;
}

.inline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.conclusions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.error {
  color: #b91c1c;
}

.success {
  color: #15803d;
}

.warn {
  color: #b45309;
  font-size: 0.88rem;
}

@media (max-width: 700px) {

  .conclusions,
  .fields.two {
    grid-template-columns: 1fr;
  }

  .charts {
    grid-template-columns: 1fr;
  }
}
</style>