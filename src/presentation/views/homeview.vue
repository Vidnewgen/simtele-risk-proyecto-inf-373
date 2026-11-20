<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const modules = [
  {
    id: 1,
    title: 'Módulo 1: Detención de Emergencia',
    subtitle: 'EDO (RK2, RK4), Integración y Raíces',
    description: 'Análisis de tiempo y distancia de frenado de cabinas ante desaceleración constante y variable.',
    status: 'Modelado Matemático (S1)',
    active: false,
    route: '/',
  },
  {
    id: 2,
    title: 'Módulo 2: Deterioro Mecánico',
    subtitle: 'Sistemas Lineales SPD y Raíces',
    description: 'Calibración de desgaste del cable (Jacobi, Gauss-Seidel, LU, Gradiente Conjugado) y umbral de inspección.',
    status: 'Prototipo Activo (S1)',
    active: true,
    route: '/modulo-2',
  },
  {
    id: 3,
    title: 'Módulo 3: Oscilaciones por Viento',
    subtitle: 'EDO 2.º Orden e Integración',
    description: 'Respuesta dinámica lateral de cabinas ante ráfagas de viento y energía acumulada.',
    status: 'Modelado Matemático (S1)',
    active: false,
    route: '/',
  },
  {
    id: 4,
    title: 'Módulo 4: Reconstrucción de Sensores',
    subtitle: 'Lagrange, Newton y Splines Cúbicos',
    description: 'Recuperación de telemetría perdida y estabilidad frente a ruido instrumental.',
    status: 'Modelado Matemático (S1)',
    active: false,
    route: '/',
  },
];
</script>

<template>
  <main class="container">
    <header class="header">
      <h1>SIMTELE-RISK</h1>
      <p>Plataforma de Análisis Numérico y Riesgos Operativos en Transporte por Cable</p>
    </header>

    <section class="grid">
      <article v-for="mod in modules" :key="mod.id" class="card" :class="{ 'card-active': mod.active }">
        <span class="badge" :class="{ 'badge-active': mod.active }">{{ mod.status }}</span>
        <h2>{{ mod.title }}</h2>
        <h4>{{ mod.subtitle }}</h4>
        <p>{{ mod.description }}</p>
        <button :disabled="!mod.active" @click="router.push(mod.route)">
          {{ mod.active ? 'Abrir Simulador' : 'Disponible en Semana 2' }}
        </button>
      </article>
    </section>
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

.header {
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}

.header h1 {
  margin: 0;
  font-size: 1.8rem;
  color: #0f172a;
}

.header p {
  margin: 0.25rem 0 0;
  color: #475569;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.card {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 1.5rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-active {
  border-color: #0f172a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.badge {
  align-self: flex-start;
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.badge-active {
  background: #0f172a;
  color: #fff;
}

.card h2 {
  font-size: 1.15rem;
  margin: 0 0 0.25rem;
}

.card h4 {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0 0 0.75rem;
  font-weight: 500;
}

.card p {
  font-size: 0.9rem;
  line-height: 1.4;
  color: #334155;
  margin-bottom: 1.25rem;
}

button {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  background: #0f172a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  background: #cbd5e1;
  color: #64748b;
  cursor: not-allowed;
}
</style>