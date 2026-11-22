# SIMTELE-RISK — PROJECT PROGRESS

## Estado general
- Semana activa: 1
- Última auditoría: 2026-11-21
- Segunda auditoría: 4.50 / 6
- Auditoría gráfica verificada: 5.25 / 6
- Corrección de Semana 1: verificada en ejecución local
- Rama verificada: abadRama

## Semana 1 — 6 puntos
- [~] Modelos de los cuatro casos (1.75 / 2 pts)
- [~] Errores y sistemas lineales (2.75 / 3 pts)
- [~] Aplicación, DER y GitHub (0.75 / 1 pt)

## Semana 2 — 9 puntos
- [ ] Métodos numéricos (5 pts)
- [ ] Escenarios, tablas y validación (2 pts)
- [ ] Persistencia e historial (2 pts)

## Semana 3 — 10 puntos
- [ ] Validación de escenarios (4 pts)
- [ ] Conclusiones (3 pts)
- [ ] Aplicación y persistencia (1 pt)
- [ ] GitHub, video y defensa (2 pts)

## Último trabajo verificado
- `npm test`: 3 archivos y 15 pruebas aprobadas.
- `npm run build`: type-check y compilación Vite aprobados.
- Implementado el umbral cuadrático del módulo 2 y probado con los tres escenarios.
- Añadida gráfica compartida de presentación numérica con ejes, cuadrícula, leyenda y marcas de umbral.
- Añadida curva cuadrática y comparación de iteraciones al módulo 2.
- Separadas las pantallas de los módulos 1, 3 y 4 en archivos Vue dedicados, reutilizando la implementación compartida sin cambiar el comportamiento.
- Unificados los endpoints públicos como `/modulo-1`, `/modulo-2`, `/modulo-3` y `/modulo-4`; las rutas antiguas conservan redirección.
- Mejorada la presentación del módulo 2 con tarjetas de métricas, fórmula destacada y tabla con estados visuales.
- La gráfica del módulo 1 cambia con cada escenario mediante tiempo de detención y parámetros reales.
- Las rutas `/`, `/modulo-2`, `/modulo/1`, `/modulo/3` y `/modulo/4` respondieron HTTP 200 en producción.
- Implementadas funciones de error absoluto, relativo, porcentual y sensibilidad.
- El módulo 2 muestra sensibilidad de escenario y κ₂(A) en tarjetas junto a raíz, referencia, error e iteraciones.
- Implementado RK2 punto medio y gráfico SVG básico en las vistas dinámicas.
- README actualizado con el estado real de los cuatro módulos.
- Las rutas `/`, `/modulo-2`, `/modulo/1`, `/modulo/3` y `/modulo/4` respondieron HTTP 200.
- Las vistas de los módulos 1, 3 y 4 renderizan tablas con resultados, referencias, errores y conclusiones similares al módulo 2.
- Implementación real de Jacobi, Gauss-Seidel, LU, gradiente conjugado, bisección, trapecio, Simpson 1/3 y RK4.
- Pruebas de modelos de detención, viento y sensores.
- Historial persistido en `localStorage`, con pruebas de guardar, recuperar y limpiar.
- Rama `abadRama` publicada y sincronizada con `origin/abadRama`.

## Archivos de respaldo
- `src/domain/math/numerical.ts`
- `src/domain/math/numerical.test.ts`
- `src/domain/models/four-module-models.ts`
- `src/domain/models/four-module-models.test.ts`
- `src/application/persistence/local-history.ts`
- `src/application/persistence/local-history.test.ts`
- `src/infrastructure/module2.mock.adapter.ts`
- `src/presentation/views/module-model.vue`
- `src/presentation/views/module2.vue`
- `src/presentation/router/index.ts`

## Problemas conocidos
- Los cambios de esta corrección no están publicados en GitHub; solo existe publicado el estado previo de `abadRama`.
- Sensibilidad numérica integrada en la visualización del Módulo 2: normal sin perturbación, estrés con factor relativo calculado y mal condicionado con κ₂(A).
- Falta Newton-Raphson, secante, Newton por diferencias divididas, splines y Romberg para completar Semana 2.
- Queda pendiente validar formalmente escenarios ESTRÉS y MAL CONDICIONADO con referencias independientes.
- DER, SQL y migraciones no fueron incluidos en esta fase.
- README no fue modificado en esta fase.

## Siguiente tarea
Completar referencias independientes de los escenarios, DER/persistencia formal y publicar los cambios antes de iniciar la auditoría final de Semana 1.
