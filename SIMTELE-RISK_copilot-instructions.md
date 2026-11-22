SIMTELE-RISK — Instrucciones para Copilot
Propósito y reglas
SIMTELE-RISK es una aplicación web educativa de Métodos Numéricos, inspirada en Mi Teleférico (La Paz). Usa únicamente datos sintéticos; no representa fallas reales ni controla equipos. Prioriza corrección matemática, trazabilidad, pruebas y persistencia sobre diseño visual.

- Conserva los cuatro módulos: Detención de emergencia, Deterioro mecánico y mantenimiento, Oscilaciones por viento y Reconstrucción de señales de sensores.
- Cada módulo debe contemplar NORMAL, ESTRÉS y MAL CONDICIONADO, con parámetros reproducibles, unidades, hipótesis y fuentes declaradas.
- No inventes requisitos, datos, archivos, tecnologías ni arquitectura. Inspecciona el repositorio y reutiliza sus patrones antes de modificarlo.
- Distingue mal condicionamiento matemático, riesgo físico, exigencia del escenario y falta de convergencia.
- Evita duplicaciones, dependencias innecesarias y cambios fuera del alcance. Valida entradas y casos límite.
- Nunca declares una función terminada sin implementación y pruebas verificables.
  Modelos por módulo

1. Detención: x'=v, v'=-a(v,t). Usa RK2/RK4; integra v(t) con trapecio compuesto, Simpson 1/3 y Romberg; encuentra v(t)=0 con bisección, Newton y secante cuando aplique. Referencia para a constante: v=v0-at, x=x0+v0t-at²/2, t_det=v0/a, d=v0²/(2a).
2. Deterioro: determina cuándo D(t)=D_umbral. Referencia D=D0+αt+βt², resuelta también analíticamente; selecciona la raíz físicamente válida. Para calibración, compara métodos lineales.
3. Viento: x'=v, v'=(F(t)-cv-kx)/m; usa RK2/RK4 e integra una magnitud definida (|x| o x²). Referencia: vibración libre subamortiguada (F=0).
4. Sensores: Lagrange, Newton por diferencias divididas y splines cúbicos con datos sintéticos (sin(t) o e^(-t)). Oculta puntos de prueba y mide error real; evalúa nodos, ruido y estabilidad.
   Métodos obligatorios en el sistema

- Errores absoluto, relativo, porcentual, residual y sensibilidad (evita división por cero).
- Sistemas Ax=b, tamaño mínimo 4: Jacobi, Gauss-Seidel, LU y gradiente conjugado; referencia, residuo, condición, iteraciones y errores. Gradiente conjugado estándar requiere matriz SPD.
- Interpolación: Lagrange, Newton y splines cúbicos.
- Raíces: bisección, Newton-Raphson y secante.
- Integración: trapecio compuesto, Simpson 1/3 compuesto y Romberg.
- EDO: RK2 (declara variante) y RK4.
  Distribuye los métodos según su pertinencia; todos deben estar implementados y probados en el proyecto.
  Evidencia por módulo/escenario
  Documenta modelo, variables, unidades, hipótesis y parámetros; tabla de iteraciones/refinamiento, tolerancia, paso, aproximación y parada; referencia analítica o numérica justificada; errores, residuos, convergencia y sensibilidad; comparación entre métodos/escenarios; al menos dos gráficos útiles. Cierra con dos conclusiones: numérica (precisión, estabilidad, iteraciones, límites) y del fenómeno (interpretación y límites de inferencia).

En MAL CONDICIONADO demuestra cuantitativamente el problema (por ejemplo, κ(A) alto, nodos desfavorables, raíz múltiple o derivada pequeña); no basta con elevar el riesgo físico.
Aplicación y persistencia
La interfaz debe ofrecer cuatro módulos y, en cada uno, modelo, parámetros, escenario, métodos pertinentes, resultados, tablas, errores y gráficos. Incluye comparación general e historial.

La persistencia debe sobrevivir al reinicio. Entidades mínimas: caso_estudio (id, nombre, versión); escenario (id, caso, tipo, parámetros y fuente); simulacion (id, escenario, fecha, estado); ejecucion_metodo (id, simulación, método, tolerancia, paso, máximo de iteraciones, convergencia, tiempo); iteracion_resultado (id, ejecución, número, aproximación, residuo, errores); resultado_resumen (id, ejecución, referencia, valor, métricas e interpretación). Mantén DER y SQL/migraciones. Prueba: ejecutar → guardar → reiniciar/actualizar → recuperar parámetros, iteraciones y gráficos → repetir y comparar dentro de tolerancia. No uses solo memoria temporal.
Rúbrica y prioridades
Total: 25 puntos. Prioriza la semana activa; no adelantes tareas que pongan en riesgo sus entregables.

- Semana 1 (6): modelos de cuatro casos (2); errores y sistemas lineales (3); aplicación, DER inicial y repositorio/README (1).
- Semana 2 (9): interpolación, raíces, integración y EDO (5); escenarios, tablas, gráficos y validación (2); aplicación, DER y persistencia (2).
- Semana 3 (10): validación de escenarios 3×4 (4); conclusiones numéricas y del problema (3); aplicación/DER/persistencia (1); GitHub, video ≤3 min y defensa (2).
  Flujo de trabajo
  Al comenzar: consulta PROJECT_PROGRESS.md; identifica semana y criterio; inspecciona solo código/pruebas relevantes; detecta bloqueos; elige el cambio mínimo de mayor valor. Implementa, ejecuta pruebas y registra solo resultados comprobados. No releas todo el repositorio sin necesidad.

Al terminar, actualiza PROJECT_PROGRESS.md con estado verificado, criterio/puntos atendidos, archivos cambiados, pruebas y resultado, pendientes y siguiente tarea. Sé conciso; no repitas este documento en tus respuestas. Si falta información estructural importante, pregunta antes de asumir.
