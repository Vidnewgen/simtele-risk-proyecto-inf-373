<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { GetModule2ScenarioUseCase } from '../../application/use-cases/get-module2-scenario.use-case'
import { Module2MockAdapter } from '../../infrastructure/module2.mock.adapter'
import type { ScenarioType } from '../../domain/models/simulation.models'

const router = useRouter()
const getScenarioUseCase = new GetModule2ScenarioUseCase(new Module2MockAdapter())

// Aquí se llama "selected"
const selected = ref<ScenarioType>('NORMAL')
const current = computed(() => getScenarioUseCase.execute(selected.value))
</script>

<template>
  <main class="container">
    <button @click="router.push('/')">← Volver</button>
    <h2>Módulo 2: Deterioro Mecánico y Mantenimiento</h2>

    <!-- Aquí también debe llamarse "selected" (no "selectedScenario") -->
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
          <td>{{ row.converged ? 'Convergió' : 'Divergió' }}</td>
          <td>{{ row.iterations }}</td>
          <td>{{ row.solution }}</td>
          <td>{{ row.residualNorm }}</td>
          <td>{{ row.absoluteError }}</td>
          <td>{{ row.relativeError }}</td>
          <td>{{ row.percentageError }}</td>
        </tr>
      </tbody>
    </table>

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
</style>