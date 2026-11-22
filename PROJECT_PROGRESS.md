# SIMTELE-RISK — PROJECT PROGRESS

## Estado general
- Semana activa: 2
- Infraestructura Docker disponible y saludable: PostgreSQL 17, PostgREST y Adminer.
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
- [x] Métodos numéricos (5.00 / 5 pts)
- [x] Escenarios, tablas y validación (2.00 / 2 pts)
- [x] Persistencia e historial (2.00 / 2 pts)

## Semana 3 — 10 puntos
- [ ] Validación de escenarios (4 pts)
- [ ] Conclusiones (3 pts)
- [ ] Aplicación y persistencia (1 pt)
- [ ] GitHub, video y defensa (2 pts)

## Último trabajo verificado
- `npm test`: 3 archivos y 16 pruebas aprobadas.
- `npm test`: 5 archivos y 25 pruebas aprobadas.
- `npm run build`: type-check y compilación Vite aprobados.
- Implementados motores y casos de uso independientes para M1, M3 y M4.
- Añadidos formularios editables de parámetros en M1, M3 y M4.
- Verificados 28 pruebas y compilación completa.
- Auditoría corregida de Semana 2: 8.75 / 9 puntos estimados.
- Auditoría con persistencia independiente: 9.00 / 9 puntos estimados.
- Persistencia PostgreSQL independiente implementada y comprobada en M1, M3 y M4.
- Migración 006 con parámetros y fuentes sintéticas de M1, M3 y M4 aplicada a Docker.
- Persistencia end-to-end probada en PostgreSQL/PostgREST: simulación NORMAL creada como `#1`, siete ejecuciones de métodos y relanzamiento con 0 diferencia máxima.
- Los módulos 1, 3 y 4 tienen al menos dos gráficas SVG independientes.
- Referencias independientes probadas en los tres escenarios de los módulos 1, 3 y 4.
- Persistencia CRUD independiente verificada en M1, M3 y M4 desde PostgreSQL/PostgREST.
- Simulaciones reales persistidas: M1 #2, M3 #3, M4 #4 y M2 #1.
- Relanzamiento independiente probado en M1 con mensaje «Reproducción exacta dentro de la representación almacenada».
- Interpolación agregada: Lagrange, Newton por diferencias divididas y spline cúbico natural.
- Pruebas verificadas: 21 pruebas aprobadas en 4 archivos.
- Las rutas `/modulo-1`, `/modulo-2`, `/modulo-3` y `/modulo-4` respondieron HTTP 200 en preview.
- Añadida Romberg con refinamiento, tabla triangular y criterio de convergencia.
- El módulo 1 compara trapecio compuesto, Simpson 1/3 y Romberg contra la distancia analítica.
- Prueba verificada: `romberg(x², 0, 1)` converge a `1/3`.
- `npm test`: 3 archivos y 15 pruebas aprobadas.
- `npm run build`: type-check y compilación Vite aprobados.
- Implementado el umbral cuadrático del módulo 2 y probado con los tres escenarios.
- Añadida gráfica compartida de presentación numérica con ejes, cuadrícula, leyenda y marcas de umbral.
- Añadida curva cuadrática y comparación de iteraciones al módulo 2.
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
- `src/domain/math/roots.ts`
- `src/domain/models/four-module-models.ts`
- `src/domain/models/four-module-models.test.ts`
- `src/application/persistence/local-history.ts`
- `src/application/persistence/local-history.test.ts`
- `src/application/persistence/module-run.types.ts`
- `src/application/persistence/module-run.use-cases.ts`
- `src/application/ports/module-run.port.ts`
- `src/infrastructure/module-run.postgrest.adapter.ts`
- `src/infrastructure/database/migrations/006_week2_modules_parameters.sql`
- `src/infrastructure/module2.mock.adapter.ts`
- `src/presentation/views/module1.vue`
- `src/presentation/views/module2.vue`
- `src/presentation/views/module3.vue`
- `src/presentation/views/module4.vue`
- `src/presentation/router/index.ts`

## Problemas conocidos
- No quedan pendientes numéricos ni de persistencia de la Semana 2; antes de Semana 3 falta formalizar la hoja escrita 3×4.
- Los cambios actuales siguen sin commit ni publicación.
- Sensibilidad numérica integrada en la visualización del Módulo 2: normal sin perturbación, estrés con factor relativo calculado y mal condicionado con κ₂(A).

## Siguiente tarea
Crear el documento formal de validación 3×4 y preparar la defensa de Semana 3.
