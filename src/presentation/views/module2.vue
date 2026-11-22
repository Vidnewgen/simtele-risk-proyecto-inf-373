<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { GetModule2ScenarioUseCase } from '@/application/use-cases/get-module2-scenario.use-case'
import { Module2MockAdapter } from '@/infrastructure/module2.mock.adapter'
import {
  METHOD_LABELS,
  type Module2ScenarioData,
  type MethodResult,
  type ScenarioType,
} from '@/domain/models/simulation.models'
import { formatPercent, formatSci, formatVector } from '@/presentation/utils/format'

const router = useRouter()
const getScenarioUseCase = new GetModule2ScenarioUseCase(new Module2MockAdapter())

const scenarios: { type: ScenarioType; label: string }[] = [
  { type: 'NORMAL', label: 'NORMAL' },
  { type: 'ESTRES', label: 'ESTRÉS' },
  { type: 'MAL_CONDICIONADO', label: 'MAL CONDICIONADO' },
]

const selected = ref<ScenarioType>('NORMAL')
const current = ref<Module2ScenarioData | null>(null)
const loading = ref(false)
const error = ref('')

watch(
  selected,
  async (type) => {
    loading.value = true
    error.value = ''
    try {
      const data = await getScenarioUseCase.execute(type)
      if (selected.value === type) current.value = data // evita respuestas fuera de orden
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const statusOf = (r: MethodResult): string =>
  r.converged ? 'Convergió' : r.solution === null ? 'Divergió' : 'No convergió (máx. iter.)'
</script>

<template>
  <main class="container">
    <div class="top-bar">
      <button class="btn-back" @click="router.push('/')">← Volver</button>
    </div>
    <h2>Módulo 2: Deterioro Mecánico y Mantenimiento</h2>

    <div class="btn-group">
      <button v-for="s in scenarios" :key="s.type" :class="{ active: selected === s.type }" @click="selected = s.type">
        {{ s.label }}
      </button>
    </div>

    <p v-if="error" class="error">Error: {{ error }}</p>
    <p v-if="loading && !current">Calculando…</p>

    <template v-if="current">
      <section class="panel">
        <h3>{{ current.title }}</h3>
        <p>{{ current.description }}</p>
        <div class="metrics-bar">
          <span><strong>κ₂(A):</strong> {{ current.conditionNumber === null ? '—' :
            current.conditionNumber.toPrecision(6) }}</span>
          <span><strong>Tolerancia:</strong> {{ formatSci(current.tolerance, 1) }}</span>
          <span><strong>Máx. iteraciones:</strong> {{ current.maxIterations }}</span>
        </div>
      </section>

      <section class="panel">
        <h3>Sistema A·x = b</h3>
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
      </section>

      <section class="panel">
        <h3>Resultados por método</h3>
        <div class="table-wrapper">
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

.btn-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
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

.metrics-bar {
  display: flex;
  flex-wrap: wrap;
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

.error {
  color: #b91c1c;
}

@media (max-width: 700px) {
  .conclusions {
    grid-template-columns: 1fr;
  }
}
</style>