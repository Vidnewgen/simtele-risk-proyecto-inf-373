<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Module2Service } from '../../application/service/module2.services';
import type { ScenarioType } from '../../domain/models/simulation.models';

const router = useRouter();
const selectedScenario = ref<ScenarioType>('NORMAL');
const data = computed(() => Module2Service.getScenario(selectedScenario.value));
</script>

<template>
  <main class="container">
    <div class="top-bar">
      <button class="btn-back" @click="router.push('/')">← Volver al Inicio</button>
      <span class="tag">Módulo 2 — Deterioro Mecánico y Mantenimiento</span>
    </div>

    <section class="controls">
      <label>Seleccionar Escenario Experimental:</label>
      <div class="btn-group">
        <button :class="{ active: selectedScenario === 'NORMAL' }" @click="selectedScenario = 'NORMAL'">NORMAL</button>
        <button :class="{ active: selectedScenario === 'ESTRES' }" @click="selectedScenario = 'ESTRES'">ESTRÉS</button>
        <button :class="{ active: selectedScenario === 'MAL_CONDICIONADO' }" @click="selectedScenario = 'MAL_CONDICIONADO'">MAL CONDICIONADO</button>
      </div>
    </section>

    <section class="panel">
      <h2>{{ data.title }}</h2>
      <p>{{ data.description }}</p>
      <div class="metrics-bar">
        <span><strong>Modelo:</strong> D(t) = D₀ + α·t + β·t²</span>
        <span><strong>Condición κ₂(A):</strong> {{ data.conditionNumber }}</span>
        <span><strong>Tolerancia ε:</strong> {{ data.tolerance }}</span>
      </div>
    </section>

    <section class="panel">
      <h3>Comparación de Métodos Numéricos (Sistemas Lineales 4×4)</h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Método</th>
              <th>Estado</th>
              <th>Iteraciones</th>
              <th>Solución Aproximada x⁽ᵏ⁾</th>
              <th>Residual ||r||₂</th>
              <th>Error Absoluto</th>
              <th>Error Relativo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.results" :key="row.method">
              <td><strong>{{ row.method }}</strong></td>
              <td>{{ row.converged ? 'Convergió' : 'Divergió' }}</td>
              <td>{{ row.iterations }}</td>
              <td><code>{{ row.solution }}</code></td>
              <td>{{ row.residualNorm }}</td>
              <td>{{ row.absoluteError }}</td>
              <td>{{ row.relativeError }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="conclusions">
      <div class="panel">
        <h3>Conclusión Numérica</h3>
        <p>{{ data.numericalConclusion }}</p>
      </div>
      <div class="panel">
        <h3>Conclusión del Problema Aplicado</h3>
        <p>{{ data.problemConclusion }}</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif; color: #1e293b; }
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.btn-back { background: transparent; border: 1px solid #cbd5e1; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; }
.tag { font-weight: 600; color: #0f172a; }
.controls { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; }
.btn-group { display: flex; gap: 0.5rem; }
.btn-group button { padding: 0.5rem 1rem; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-group button.active { background: #0f172a; color: #fff; border-color: #0f172a; }
.panel { border: 1px solid #cbd5e1; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; background: #fff; }
.panel h2, .panel h3 { margin-top: 0; font-size: 1.15rem; }
.metrics-bar { display: flex; gap: 2rem; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; font-size: 0.9rem; }
.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
th, td { border: 1px solid #cbd5e1; padding: 0.6rem; text-align: left; }
th { background: #f1f5f9; }
.conclusions { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
</style>