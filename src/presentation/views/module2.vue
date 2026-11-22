<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { GetModule2ScenarioUseCase } from '../../application/use-cases/get-module2-scenario.use-case'
import { Module2MockAdapter } from '../../infrastructure/module2.mock.adapter'
import type { ScenarioType } from '../../domain/models/simulation.models'
import { browserHistoryRepository } from '../../application/persistence/local-history'
import { module2Deterioration } from '../../domain/models/four-module-models'
import { norm, sensitivityEstimate } from '../../domain/math/numerical'
import NumericalChart, { type ChartSeries } from '../components/NumericalChart.vue'

const router = useRouter()
const getScenarioUseCase = new GetModule2ScenarioUseCase(new Module2MockAdapter())
const selected = ref<ScenarioType>('NORMAL')

const deterioration = computed(() => module2Deterioration({
  name: selected.value,
  description: 'Calibración sintética del desgaste',
  equation: 'D(t) = D₀ + αt + βt²',
}))

const current = computed(() => getScenarioUseCase.execute(selected.value))

const deteriorationSeries = computed(() => {
  const result = deterioration.value
  const points = 60
  const end = Math.max(result.thresholdTime * 1.35, 1)
  const values = Array.from({ length: points }, (_, index) => {
    const time = end * index / (points - 1)
    return result.parameters.initialDeterioration
      + result.parameters.alpha * time
      + result.parameters.beta * time * time
  })
  const thresholdValues = Array.from({ length: points }, () => result.parameters.threshold)
  return [
    { name: 'Deterioro D(t)', values, color: '#2563eb' },
    { name: 'Umbral crítico', values: thresholdValues, color: '#ef4444', dashed: true },
  ] as ChartSeries[]
})

const methodSeries = computed(() => [
  {
    name: 'Iteraciones',
    values: current.value.results.map(row => row.iterations),
    color: '#7c3aed',
  },
] as ChartSeries[])

const sensitivityAnalysis = computed(() => {
  if (selected.value === 'ESTRES') {
    const normalNorm = norm([1, 2, 2, 1])
    const perturbedNorm = norm([1.080357, 1.978571, 2.005357, 0.998661])
    return {
      value: sensitivityEstimate(6, 6.3, normalNorm, perturbedNorm).toFixed(4),
      detail: 'Perturbación relativa de entrada: 5%; salida medida por ||x||₂',
    }
  }
  if (selected.value === 'MAL_CONDICIONADO') {
    return {
      value: '15,513.74',
      detail: 'κ₂(A): factor teórico máximo de amplificación de entrada a salida',
    }
  }
  return {
    value: '0',
    detail: 'Sin perturbación aplicada en el escenario normal',
  }
})

watch(selected, (scenario) => {
  browserHistoryRepository().save({
    moduleId: 2,
    scenario,
    summary: current.value.numericalConclusion,
  })
}, { immediate: true })
</script>

<template>
  <main class="container">
    <button @click="router.push('/')">← Volver</button>
    <h2>Módulo 2: Deterioro Mecánico y Mantenimiento</h2>

    <div class="tabs">
      <button :class="{ active: selected === 'NORMAL' }" @click="selected = 'NORMAL'">NORMAL</button>
      <button :class="{ active: selected === 'ESTRES' }" @click="selected = 'ESTRES'">ESTRÉS</button>
      <button :class="{ active: selected === 'MAL_CONDICIONADO' }" @click="selected = 'MAL_CONDICIONADO'">MAL
        CONDICIONADO</button>
    </div>

    <div class="box">
      <h3>{{ current.title }}</h3>
      <p>{{ current.description }}</p>
      <p><strong>Condición κ₂(A):</strong> {{ current.conditionNumber }} | <strong>Tolerancia:</strong> {{
        current.tolerance }}</p>
    </div>

    <div class="metric-grid">
      <article class="metric-card">
        <span>Raíz válida</span>
        <strong>{{ deterioration.thresholdTime.toFixed(4) }}</strong>
        <small>meses</small>
      </article>
      <article class="metric-card">
        <span>Referencia analítica</span>
        <strong>{{ deterioration.analyticalThresholdTime.toFixed(4) }}</strong>
        <small>meses</small>
      </article>
      <article class="metric-card accent">
        <span>Error absoluto</span>
        <strong>{{ deterioration.thresholdError.toExponential(3) }}</strong>
        <small>meses</small>
      </article>
      <article class="metric-card">
        <span>Bisecciones</span>
        <strong>{{ deterioration.iterations }}</strong>
        <small>iteraciones</small>
      </article>
      <article class="metric-card sensitivity">
        <span>Sensibilidad / κ₂(A)</span>
        <strong>{{ sensitivityAnalysis.value }}</strong>
        <small>{{ sensitivityAnalysis.detail }}</small>
      </article>
    </div>

    <div class="formula">
      <span>Modelo de deterioro</span>
      <strong>D(t) = {{ deterioration.parameters.initialDeterioration }} +
        {{ deterioration.parameters.alpha }}t +
        {{ deterioration.parameters.beta }}t²</strong>
      <small>Umbral: {{ deterioration.parameters.threshold }}</small>
    </div>

    <NumericalChart
      title="Evolución del deterioro"
      subtitle="Curva cuadrática y cruce del umbral crítico"
      x-label="Tiempo (meses)"
      y-label="Deterioro D(t)"
      :x-end="Math.max(deterioration.thresholdTime * 1.35, 1)"
      :threshold-x="deterioration.thresholdTime"
      :threshold-label="`Umbral ${deterioration.thresholdTime.toFixed(2)} meses`"
      :series="deteriorationSeries"
    />

    <NumericalChart
      title="Comparación del costo computacional"
      subtitle="Iteraciones requeridas por cada método"
      x-label="Métodos"
      y-label="Iteraciones"
      :x-end="Math.max(current.results.length - 1, 1)"
      :x-labels="current.results.map(row => row.method)"
      :series="methodSeries"
    />

    <div class="table-wrapper">
      <table>
      <thead>
        <tr>
          <th>Método</th>
          <th>Estado</th>
          <th>Iteraciones</th>
          <th>Solución x⁽ᵏ⁾</th>
          <th>Residual ||r||₂</th>
          <th>Error Abs.</th>
          <th>Error Rel.</th>
          <th>Error %</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in current.results" :key="row.method">
          <td><strong>{{ row.method }}</strong></td>
          <td><span :class="['status', row.converged ? 'success' : 'danger']">{{ row.converged ? 'Convergió' : 'Divergió' }}</span></td>
          <td>{{ row.iterations }}</td>
          <td>{{ row.solution }}</td>
          <td>{{ row.residualNorm }}</td>
          <td>{{ row.absoluteError }}</td>
          <td>{{ row.relativeError }}</td>
          <td>{{ row.percentageError }}</td>
        </tr>
      </tbody>
      </table>
    </div>

    <div class="conclusions">
      <div class="box">
        <h4>Conclusión Numérica</h4>
        <p>{{ current.numericalConclusion }}</p>
      </div>
      <div class="box">
        <h4>Conclusión del Problema</h4>
        <p>{{ current.problemConclusion }}</p>
      </div>
    </div>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.btn-back {
  background: transparent;
  border: 1px solid #cbd5e1;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
}

.tag {
  font-weight: 600;
  color: #0f172a;
}

.controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.btn-group {
  display: flex;
  gap: 0.5rem;
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

.panel h2,
.panel h3 {
  margin-top: 0;
  font-size: 1.15rem;
}

.metrics-bar {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
  font-size: 0.9rem;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

th,
td {
  border: 1px solid #cbd5e1;
  padding: 0.6rem;
  text-align: left;
}

th {
  background: #f1f5f9;
}

.conclusions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.tabs button {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.tabs button.active {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.metric-card {
  display: flex;
  flex-direction: column;
  min-height: 100px;
  justify-content: center;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  padding: 1rem;
  background: #fff;
}

.metric-card.accent {
  background: #fff7ed;
  border-color: #fed7aa;
}
.metric-card.sensitivity {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.metric-card span { color: #64748b; font-size: 0.78rem; }
.metric-card strong { margin-top: 0.35rem; color: #0f172a; font-size: 1.28rem; }
.metric-card small { color: #94a3b8; }

.formula {
  display: grid;
  grid-template-columns: 150px 1fr auto;
  align-items: center;
  gap: 1rem;
  border: 1px solid #dbe3ef;
  border-left: 4px solid #2563eb;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  background: #f8fafc;
  margin-bottom: 1.5rem;
}

.formula span, .formula small { color: #64748b; }
.formula strong { color: #1e3a8a; font-size: 1rem; }

.status {
  display: inline-block;
  border-radius: 999px;
  padding: 0.22rem 0.55rem;
  font-weight: 700;
  font-size: 0.78rem;
}

.status.success { background: #dcfce7; color: #166534; }
.status.danger { background: #fee2e2; color: #991b1b; }

tbody tr:nth-child(even) { background: #f8fafc; }

.box {
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.25rem;
  background: #fff;
  box-shadow: 0 5px 18px rgba(15, 23, 42, 0.04);
}

.box h3, .box h4 { margin-top: 0; }

@media (max-width: 820px) {
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .formula { grid-template-columns: 1fr; }
  .conclusions { grid-template-columns: 1fr; }
}

@media (max-width: 520px) {
  .metric-grid { grid-template-columns: 1fr; }
  .container { padding: 1rem; }
}
</style>