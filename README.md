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
- **Estado actual (Avance Semana 1):**
  - Estructura del proyecto en **Vue 3 + Vite + TypeScript** organizada bajo **Arquitectura Limpia (Clean Architecture)** (`domain`, `application`, `presentation`, `router`).
  - **Vista Principal (`HomeView`):** Panel de inicio con las cuatro tarjetas de los módulos obligatorios del sistema.
  - **Módulo 2 — Deterioro Mecánico y Mantenimiento (`Module2View`):** Caso piloto implementado con selector interactivo para los tres escenarios experimentales (`NORMAL`, `ESTRÉS` y `MAL CONDICIONADO`), tablas comparativas de convergencia (Jacobi, Gauss-Seidel, Factorización LU y Gradiente Conjugado), métricas de error transversal y conclusiones diferenciadas.
  - **Módulos 1, 3 y 4:** Modelado matemático y definición de escenarios documentados en el informe de avance; integración algorítmica programada para la Semana 2.

---

## Arquitectura del Proyecto

```text
src/
├── domain/                          # Modelos puros, entidades y reglas matemáticas
│   ├── models/
│   │   └── simulation.model.ts      # Contratos de escenarios, métodos y métricas de error
│   └── math/                        # Motor numérico transversal (en desarrollo)
├── application/                     # Casos de uso y servicios de datos
│   └── services/
│       └── module2.service.ts       # Escenarios y resultados de referencia del Módulo 2
├── presentation/                    # Capa de interfaz gráfica (Vue 3)
│   └── views/
│       ├── HomeView.vue             # Panel principal con los 4 casos de estudio
│       └── Module2View.vue          # Simulador y tablas del Módulo 2
├── router/
│   └── index.ts                     # Configuración de rutas SPA
├── App.vue
└── main.ts
```

---

## Guía de Inicio Rápido en Git (`develop`)

1. **Clonar el repositorio y cambiar a la rama de desarrollo:**
   ```sh
   git clone https://github.com/TU_USUARIO/simtele-risk.git
   cd simtele-risk
   git checkout develop
   ```

2. **Subir nuevos avances a la rama `develop`:**
   ```sh
   git add .
   git commit -m "feat: descripcion del avance realizado"
   git push origin develop
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