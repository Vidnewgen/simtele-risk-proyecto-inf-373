<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const modules = [
  {
    id: 1,
    code: 'M-01',
    title: 'Detención de Emergencia',
    subtitle: 'EDO (RK2, RK4), Integración Numérica y Raíces',
    description: 'Modelado y simulación de la dinámica de desaceleración de cabinas ante frenado de emergencia. Cuantificación de tiempos críticos y distancias de parada bajo condiciones variables.',
    methods: ['Runge-Kutta 2 y 4', 'Trapecio y Simpson 1/3', 'Extrapolación Romberg', 'Bisección'],
    status: 'Modelo Activo (S1)',
    active: true,
    route: '/modulo-1',
  },
  {
    id: 2,
    code: 'M-02',
    title: 'Deterioro Mecánico y Mantenimiento',
    subtitle: 'Sistemas Lineales SPD y Métodos de Raíces',
    description: 'Calibración multivariable del desgaste estructural en cable portador-tractor. Estimación de matrices de rigidez, propagación de perturbaciones y cálculo del horizonte de inspección.',
    methods: ['Jacobi y Gauss-Seidel', 'Gradiente Conjugado', 'Factorización LU', 'Newton-Raphson y Secante'],
    status: 'Prototipo Activo (S1)',
    active: true,
    route: '/modulo-2',
  },
  {
    id: 3,
    code: 'M-03',
    title: 'Oscilaciones por Ráfagas de Viento',
    subtitle: 'EDO de Segundo Orden e Integración Compuesta',
    description: 'Análisis de estabilidad pendular lateral en tramos intertorre expuestos a viento cruzado. Evaluación de resonancia, amortiguamiento estructural y energía cinética acumulada.',
    methods: ['RK4 Sistema Acoplado', 'Punto Medio (RK2)', 'Solución Analítica Subamortiguada', 'Integral de Energía'],
    status: 'Modelo Activo (S1)',
    active: true,
    route: '/modulo-3',
  },
  {
    id: 4,
    code: 'M-04',
    title: 'Reconstrucción de Telemetría y Sensores',
    subtitle: 'Interpolación Polinomial y Splines Cúbicos',
    description: 'Recuperación de series temporales de posición y tensión con pérdida de paquetes. Análisis de estabilidad numérica ante ruido instrumental y comparación de interpoladores.',
    methods: ['Polinomio de Lagrange', 'Diferencias Divididas de Newton', 'Spline Cúbico Natural', 'Estimación de Error'],
    status: 'Modelo Activo (S1)',
    active: true,
    route: '/modulo-4',
  },
]
</script>

<template>
  <div class="home-page">
    <!-- ── Top Navigation Bar ── -->
    <header class="top-nav">
      <div class="nav-container">
        <div class="brand-group">
          <div class="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="brand-svg" aria-hidden="true">
              <path d="M4 18h16M4 6h16M9 6v12M15 6v12M3 10l9-4 9 4M7 21h10" />
            </svg>
          </div>
          <div>
            <span class="brand-title">SIMTELE-RISK</span>
            <span class="brand-subtitle">Análisis Numérico de Transporte por Cable</span>
          </div>
        </div>
        <div class="nav-meta">
          <span class="meta-tag">UMSA</span>
          <span class="meta-separator">/</span>
          <span class="meta-tag">INF-373</span>
          <span class="meta-separator">/</span>
          <span class="meta-tag">Gestión II-2026</span>
        </div>
      </div>
    </header>

    <!-- ── Hero Banner ── -->
    <section class="hero-section">
      <div class="hero-container">
        <div class="hero-text-block">
          <div class="badge-academic">Plataforma Académica de Simulación</div>
          <h1 class="hero-heading">Cuantificación de Riesgos Operativos y Métodos Numéricos</h1>
          <p class="hero-lead">
            Entorno experimental para la resolución de ecuaciones diferenciales ordinarias, sistemas lineales simétricos
            y problemas de interpolación aplicados al comportamiento físico del sistema de transporte por cable aéreo.
          </p>
        </div>
        <div class="hero-kpis">
          <div class="kpi-card">
            <span class="kpi-num">04</span>
            <span class="kpi-label">Módulos de Simulación</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-num">03</span>
            <span class="kpi-label">Escenarios Sintéticos</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-num">12+</span>
            <span class="kpi-label">Métodos Numéricos</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Modules Section ── -->
    <main class="main-body">
      <div class="section-header">
        <div>
          <h2 class="section-title">Módulos de Análisis Numérico</h2>
          <p class="section-desc">Seleccione una unidad temática para ejecutar simulaciones, calibrar parámetros y consultar el historial de resultados.</p>
        </div>
      </div>

      <div class="modules-grid">
        <article
          v-for="mod in modules"
          :key="mod.id"
          class="module-card"
          :class="{ 'is-active': mod.active, 'is-inactive': !mod.active }"
        >
          <div class="card-top">
            <span class="module-code">{{ mod.code }}</span>
            <span class="status-pill" :class="mod.active ? 'status-pill--active' : 'status-pill--pending'">
              {{ mod.status }}
            </span>
          </div>

          <div class="card-content">
            <h3 class="module-title">{{ mod.title }}</h3>
            <p class="module-subtitle">{{ mod.subtitle }}</p>
            <p class="module-desc">{{ mod.description }}</p>

            <div class="methods-list" aria-label="Métodos implementados">
              <span v-for="method in mod.methods" :key="method" class="method-tag">
                {{ method }}
              </span>
            </div>
          </div>

          <div class="card-action">
            <button
              class="launch-btn"
              :disabled="!mod.active"
              @click="router.push(mod.route)"
              :aria-label="`Abrir simulador para ${mod.title}`"
            >
              <span>{{ mod.active ? 'Abrir Simulador' : 'Próximamente' }}</span>
              <svg viewBox="0 0 20 20" fill="currentColor" class="btn-icon" aria-hidden="true">
                <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </article>
      </div>
    </main>

    <!-- ── Academic Footer ── -->
    <footer class="page-footer">
      <div class="footer-container">
        <p class="footer-text">
          Universidad Mayor de San Andrés · Facultad de Ciencias Puras y Naturales · Carrera de Informática
        </p>
        <p class="footer-meta">
          INF-373 Métodos Numéricos · Docente: Lic. Brígida Alexandra Carvajal Blanco · Parámetros educativos reproducibles
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--sr-bg-page, #f8fafc);
  color: var(--sr-text-primary, #0f172a);
}

/* ── Top Bar ── */
.top-nav {
  background-color: #0b1120;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.nav-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand-group {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}
.brand-svg {
  width: 20px;
  height: 20px;
}
.brand-title {
  display: block;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #ffffff;
}
.brand-subtitle {
  display: block;
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 500;
}
.nav-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #94a3b8;
}
.meta-tag {
  font-weight: 600;
  letter-spacing: 0.03em;
}
.meta-separator {
  color: #475569;
}

/* ── Hero ── */
.hero-section {
  background: linear-gradient(180deg, #0b1120 0%, #0f172a 100%);
  border-bottom: 1px solid #1e293b;
  padding: 3.5rem 1.5rem 3rem;
  color: #ffffff;
}
.hero-container {
  max-width: 1240px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3rem;
  align-items: flex-end;
}
.badge-academic {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background-color: rgba(37, 99, 235, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #93c5fd;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 1rem;
}
.hero-heading {
  font-size: clamp(1.75rem, 3.5vw, 2.35rem);
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 1rem;
  color: #f8fafc;
  letter-spacing: -0.02em;
}
.hero-lead {
  font-size: 0.95rem;
  line-height: 1.6;
  color: #94a3b8;
  max-width: 660px;
  margin: 0;
}
.hero-kpis {
  display: flex;
  gap: 1rem;
}
.kpi-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  min-width: 110px;
  text-align: center;
}
.kpi-num {
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  color: #60a5fa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.kpi-label {
  display: block;
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 0.25rem;
}

/* ── Main Body ── */
.main-body {
  max-width: 1240px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 3.5rem;
  flex: 1;
  width: 100%;
}
.section-header {
  margin-bottom: 1.75rem;
}
.section-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.35rem;
  letter-spacing: -0.01em;
}
.section-desc {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

/* ── Modules Grid ── */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}
.module-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1.65rem;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.module-card.is-active:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.module-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  font-weight: 700;
  color: #1d4ed8;
  background-color: #eff6ff;
  border: 1px solid #dbeafe;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  letter-spacing: 0.05em;
}
.status-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
}
.status-pill--active {
  background-color: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}
.status-pill--pending {
  background-color: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
}
.card-content {
  flex: 1;
}
.module-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.25rem;
  line-height: 1.35;
}
.module-subtitle {
  font-size: 0.8rem;
  font-weight: 600;
  color: #2563eb;
  margin: 0 0 0.75rem;
}
.module-desc {
  font-size: 0.85rem;
  line-height: 1.55;
  color: #475569;
  margin: 0 0 1.25rem;
}
.methods-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
}
.method-tag {
  font-size: 0.72rem;
  background-color: #f1f5f9;
  color: #334155;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  font-weight: 500;
}
.card-action {
  margin-top: auto;
  border-top: 1px solid #f1f5f9;
  padding-top: 1.2rem;
}
.launch-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  background-color: #0f172a;
  color: #ffffff;
  border: 1px solid #0f172a;
  transition: all 0.15s ease;
}
.launch-btn:hover:not(:disabled) {
  background-color: #1e293b;
  border-color: #1e293b;
}
.launch-btn:disabled {
  background-color: #f1f5f9;
  color: #94a3b8;
  border-color: #e2e8f0;
  cursor: not-allowed;
}
.btn-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.15s ease;
}
.launch-btn:hover:not(:disabled) .btn-icon {
  transform: translateX(3px);
}

/* ── Footer ── */
.page-footer {
  border-top: 1px solid #e2e8f0;
  background-color: #ffffff;
  padding: 1.75rem 1.5rem;
  color: #64748b;
  font-size: 0.78rem;
  text-align: center;
}
.footer-container {
  max-width: 1240px;
  margin: 0 auto;
}
.footer-text {
  margin: 0 0 0.35rem;
  font-weight: 600;
  color: #334155;
}
.footer-meta {
  margin: 0;
  color: #94a3b8;
}

/* ── Responsive ── */
@media (max-width: 960px) {
  .hero-container {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  .modules-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .nav-meta {
    display: none;
  }
  .hero-kpis {
    width: 100%;
    justify-content: flex-start;
  }
  .kpi-card {
    flex: 1;
    min-width: 0;
    padding: 0.75rem 0.5rem;
  }
  .hero-section {
    padding: 2.25rem 1rem 2rem;
  }
  .main-body {
    padding: 1.75rem 1rem 2.5rem;
  }
}
</style>
