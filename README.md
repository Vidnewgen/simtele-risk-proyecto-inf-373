# SIMTELE-RISK

Plataforma web integrada para el análisis, simulación y cuantificación de riesgos operativos en sistemas de transporte por cable aéreo (contexto académico inspirado en Mi Teleférico, La Paz — parámetros sintéticos estrictamente educativos).

**Universidad:** Universidad Mayor de San Andrés (UMSA) — Carrera de Informática  
**Materia:** INF-373 — Métodos Numéricos  
**Docente:** Lic. Brígida Alexandra Carvajal Blanco  
**Gestión:** II / 2026  
**Integrantes:**
- Mamani Riveros Juan Vidal
- Alanoca Ojeda Lenz Abad

---

## Flujo de Trabajo y Estado del Repositorio (Git)

- **Rama activa de desarrollo (`develop`):** Todo el código fuente, arquitectura y avance continuo del proyecto se encuentra alojado y en desarrollo activo dentro de la rama `develop`. La rama `main` se reserva exclusivamente para versiones estables consolidadas al cierre de cada hito semanal.
- **Estado actual (Avance Semana 2):**
  - Estructura del proyecto en **Vue 3 + Vite + TypeScript** organizada bajo **Arquitectura Limpia (Clean Architecture)** (`domain`, `application`, `infrastructure`, `presentation`, `router`).
  - **Infraestructura con Docker:** Base de datos **PostgreSQL 17**, API REST automática con **PostgREST**, y panel de administración **Adminer**, todo orquestado con `docker-compose`.
  - **Vista Principal (`HomeView`):** Panel de inicio con las cuatro tarjetas de los módulos obligatorios del sistema.
  - **Módulo 2 — Deterioro Mecánico y Mantenimiento (`Module2View`):** Escenarios `NORMAL`, `ESTRÉS` y `MAL CONDICIONADO`, Jacobi, Gauss-Seidel, LU y gradiente conjugado, raíz cuadrática de deterioro y métricas de error. Ahora con persistencia real en PostgreSQL y gráficos interactivos.
  - **Módulo 1 — Detención:** bisección, trapecio, Simpson, Romberg, RK2/RK4, dos gráficas y CRUD PostgreSQL independiente.
  - **Módulo 3 — Oscilaciones por viento:** sistema RK2/RK4, integración, referencia libre subamortiguada, dos gráficas y CRUD PostgreSQL independiente.
  - **Módulo 4 — Sensores:** comparación de Lagrange, Newton por diferencias divididas y spline cúbico natural, dos gráficas y CRUD PostgreSQL independiente.
  - **Servicios independientes:** M1, M3 y M4 tienen motor y caso de uso propios; comparten únicamente el adaptador de persistencia PostgREST.
  - **Motor numérico (`domain/math/`):** Álgebra lineal (`linear.ts`), raíces (`roots.ts`), integración (`numerical.ts`) e interpolación (`interpolation.ts`) con pruebas.

---

## Arquitectura del Proyecto

```text
simtele-risk/
├── docker-compose.yml               # Orquestación: PostgreSQL + PostgREST + Adminer
├── vite.config.ts                   # Proxy /api → PostgREST (localhost:3000)
├── package.json
└── src/
    ├── domain/                          # Modelos puros, entidades y reglas matemáticas
    │   ├── models/
    │   │   ├── simulation.models.ts     # Contratos de escenarios y métricas
    │   │   ├── simulation.model.ts      # Modelo de simulación individual
    │   │   └── four-module-models.ts    # Modelos de los módulos 1, 3 y 4
    │   └── math/                        # Motor numérico transversal
    │       ├── linear.ts                # Jacobi, Gauss-Seidel, LU, gradiente conjugado
    │       ├── roots.ts                 # Bisección, Newton, secante
    │       ├── errors.ts                # Funciones de cálculo de error
    │       ├── numerical.ts             # Trapecio, Simpson, Romberg, RK2 y RK4
    │       └── interpolation.ts         # Lagrange, Newton-DD y spline cúbico
    ├── application/                     # Casos de uso y servicios de datos
    │   ├── use-cases/
    │   │   ├── module1.use-cases.ts     # Casos de uso independientes del Módulo 1
    │   │   ├── module2.use-cases.ts     # Casos de uso independientes del Módulo 2
    │   │   ├── module3.use-cases.ts     # Casos de uso independientes del Módulo 3
    │   │   ├── module4.use-cases.ts     # Casos de uso independientes del Módulo 4
    │   │   └── module-run.use-cases.ts  # CRUD compartido de infraestructura
    │   ├── services/
    │   │   ├── module1.engine.ts        # Motor independiente del Módulo 1
    │   │   ├── module2.engine.ts        # Motor independiente del Módulo 2
    │   │   ├── module3.engine.ts        # Motor independiente del Módulo 3
    │   │   └── module4.engine.ts        # Motor independiente del Módulo 4
    │   ├── ports/
    │   │   ├── module1.port.ts          # Parámetros independientes del Módulo 1
    │   │   ├── module2.port.ts          # Interfaz/contrato del Módulo 2
    │   │   ├── module3.port.ts          # Parámetros independientes del Módulo 3
    │   │   ├── module4.port.ts          # Parámetros independientes del Módulo 4
    │   │   └── module-run.port.ts       # Interfaz de persistencia compartida
    │   └── persistence/
    │       ├── module-run.types.ts      # Snapshot y resumen persistible
    │       └── module-run.use-cases.ts  # Casos de uso de persistencia compartida
    ├── infrastructure/                  # Adaptadores y base de datos
    │   ├── database/
    │   │   ├── postgrest.client.ts      # Cliente HTTP genérico para PostgREST
    │   │   └── migrations/              # Scripts SQL ejecutados al iniciar el contenedor
    │   │       ├── 001_initial_schema.sql
    │   │       ├── 002_seed_catalogs.sql
    │   │       ├── 003_api_permissions.sql
    │   │       ├── 004_seed_module2.sql
    │   │       ├── 005_module2_week2.sql
    │   │       └── 006_week2_modules_parameters.sql
    │   ├── module-run.postgrest.adapter.ts # Adaptador CRUD compartido M1/M3/M4
    │   ├── module2.postgrest.adapter.ts # Adaptador real (PostgreSQL vía PostgREST)
    │   └── module2.mock.adapter.ts      # Adaptador mock (datos en memoria)
    ├── presentation/                    # Capa de interfaz gráfica (Vue 3)
    │   ├── views/
    │   │   ├── HomeView.vue             # Panel principal con los 4 casos de estudio
    │   │   ├── module1.vue              # Pantalla independiente del Módulo 1
    │   │   ├── module2.vue              # Pantalla independiente del Módulo 2
    │   │   ├── module3.vue              # Pantalla independiente del Módulo 3
    │   │   └── module4.vue              # Pantalla independiente del Módulo 4
    │   ├── components/
    │   │   ├── LineChart.vue            # Componente de gráficos interactivos
    │   │   └── chart.types.ts           # Tipos para gráficos
    │   └── utils/
    │       └── format.ts                # Utilidades de formato
    ├── router/
    │   └── index.ts                     # Configuración de rutas SPA
    ├── App.vue
    └── main.ts
```

---

## Prerequisitos

- **Node.js** `24.22.2`
- **Docker** y **Docker Compose** (para la base de datos y API)

---

## Guía de Inicio Rápido

### 1. Clonar el repositorio y cambiar a la rama de desarrollo

```sh
git clone https://github.com/TU_USUARIO/simtele-risk.git
cd simtele-risk
git checkout develop
```

### 2. Levantar la infraestructura (PostgreSQL + PostgREST + Adminer)

```sh
docker compose up -d
```

Esto levanta tres servicios:

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **PostgreSQL 17** | `5432` | Base de datos relacional. Las migraciones en `src/infrastructure/database/migrations/` se ejecutan automáticamente al primer inicio. |
| **PostgREST** | `3000` | API REST auto-generada a partir del esquema de PostgreSQL. |
| **Adminer** | `8080` | Panel web para administrar la base de datos. Acceder en [http://localhost:8080](http://localhost:8080) con `postgres` / `postgres`. |

> **Credenciales por defecto:** usuario `postgres`, contraseña `postgres`, base de datos `simtele`.

### 3. Instalar dependencias de Node

```sh
npm install
```

### 4. Iniciar el servidor de desarrollo

```sh
npm run dev
```

Vite levanta en `http://localhost:5173` con proxy automático: todas las peticiones a `/api/*` se redirigen a PostgREST en `localhost:3000`.

### 5. Subir nuevos avances a la rama `develop`

```sh
git add .
git commit -m "feat: descripcion del avance realizado"
git push origin develop
```

### Comandos útiles de Docker

```sh
# Ver logs de los contenedores
docker compose logs -f

# Detener todos los servicios
docker compose down

# Detener y borrar los datos de la BD (reset completo)
docker compose down -v
```

---

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Ejecutar pruebas

```sh
npm test
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Vue 3 + TypeScript + Vite |
| API REST | PostgREST (auto-generada desde PostgreSQL) |
| Base de datos | PostgreSQL 17 |
| Admin BD | Adminer |
| Contenedores | Docker Compose |
| Testing | Vitest |
