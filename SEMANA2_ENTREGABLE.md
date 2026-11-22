# SIMTELE-RISK - Entregable de Semana 2

## Avance académico

### Semana 2 - Integración matemática y aplicación - 9 puntos

- Se implementaron:
  - Interpolación: Lagrange, Newton por diferencias divididas y spline cúbico.
  - Raíces: bisección, Newton-Raphson y secante.
  - Integración: trapecio compuesto, Simpson 1/3 compuesto y Romberg.
  - Ecuaciones diferenciales: RK2 con variante punto medio y RK4 clásico.
- Los cuatro módulos permiten ejecutar escenarios `NORMAL`, `ESTRÉS` y `MAL CONDICIONADO`.
- Los módulos muestran parámetros editables, tablas de resultados, errores, referencias y al menos dos gráficos.
- El módulo 2 incluye comparación de sistemas lineales, raíces, iteraciones, residuales y sensibilidad.
- PostgreSQL, PostgREST y Adminer funcionan mediante Docker Compose.
- Los cuatro módulos permiten guardar, listar, abrir, actualizar, relanzar y eliminar simulaciones.
- Los resultados almacenados incluyen parámetros, métodos, resúmenes, iteraciones y conclusiones.

## Enlaces de entrega

- **Repositorio:** [Vidnewgen/simtele-risk-proyecto-inf-373](https://github.com/Vidnewgen/simtele-risk-proyecto-inf-373)
- **Rama revisada:** `feat/modulo3` o la rama donde se publique la versión final.
- **Aplicación local:** `http://localhost:5173`
- **PostgREST:** `http://localhost:3000`
- **Adminer:** `http://localhost:8080`
- **Enlace público de la aplicación:** completar con la URL desplegada, si existe.

---

# Guía manual de evaluación

## 1. Preparación

Desde la raíz del proyecto:

```sh
docker compose up -d
npm install
npm run dev
```

Abrir `http://localhost:5173`.

La infraestructura activa debe mostrar:

- PostgreSQL en el puerto `5432`.
- PostgREST en `http://localhost:3000`.
- Adminer en `http://localhost:8080`.
- Las rutas:
  - `/modulo-1`
  - `/modulo-2`
  - `/modulo-3`
  - `/modulo-4`

## 2. Controles que deben aparecer en todos los módulos

En cada módulo comprobar:

1. Selección entre `NORMAL`, `ESTRÉS` y `MAL CONDICIONADO`.
2. Formulario de parámetros editable.
3. Validación de valores inválidos.
4. Tablas con resultado calculado, referencia y error.
5. Al menos dos gráficos diferentes.
6. Conclusión numérica.
7. Conclusión del fenómeno.
8. Pestañas `Simulador` e `Historial`.
9. Acciones guardar, actualizar, abrir, relanzar y eliminar.

## 3. Evaluación del Módulo 1 - Detención

Ruta: `http://localhost:5173/modulo-1`

### Escenario NORMAL

Usar los parámetros iniciales:

- Velocidad inicial `v₀ = 20 m/s`.
- Desaceleración `a = 2 m/s²`.

Comprobar:

- Tiempo de detención cercano a `10 s`.
- Distancia analítica cercana a `100 m`.
- Trapecio compuesto.
- Simpson 1/3 compuesto.
- Romberg.
- Error absoluto pequeño.
- Bisección reporta aproximadamente `33` iteraciones.
- Primera gráfica: velocidad frente al tiempo.
- Segunda gráfica: comparación de distancias numéricas.

### ESTRÉS

Cambiar o seleccionar:

- `v₀ = 24 m/s`.
- `a = 2.8 m/s²`.

Comprobar que cambian el tiempo de detención, la distancia y los resultados de integración.

### MAL CONDICIONADO

Seleccionar:

- `v₀ = 24 m/s`.
- `a = 0.4 m/s²`.

Comprobar que el intervalo de detención es más largo y que la separación entre escenarios es cuantitativa.

## 4. Evaluación del Módulo 2 - Deterioro

Ruta: `http://localhost:5173/modulo-2`

### NORMAL

Comprobar:

- Matriz 4×4 bien condicionada.
- Bisección, Newton-Raphson y secante.
- Jacobi, Gauss-Seidel, LU y gradiente conjugado.
- Raíz analítica de la ecuación cuadrática.
- Residuales y errores.
- Gráfica de `D(t)`, umbral e inspección.
- Gráfica de convergencia lineal.
- Gráfica de convergencia de raíces.
- Tabla de iteraciones.

### ESTRÉS

Comprobar:

- Perturbación de `b₁`.
- Tolerancia estricta.
- Comparación de las iteraciones.
- Inspección posterior al umbral.
- Conclusiones numérica y del fenómeno.

### MAL CONDICIONADO

Comprobar:

- Matriz de Hilbert H4.
- Número de condición aproximadamente `15514`.
- Jacobi diverge.
- Gauss-Seidel converge lentamente.
- Gradiente conjugado y LU mantienen convergencia.
- Raíz doble o derivada pequeña.
- Sensibilidad cuantitativa diferente de un simple riesgo físico.

## 5. Evaluación del Módulo 3 - Viento

Ruta: `http://localhost:5173/modulo-3`

### NORMAL

Comprobar:

- Masa `1`.
- Amortiguamiento `1.2`.
- Rigidez `4`.
- Amplitud `1`.
- Duración `20 s`.
- Paso RK `0.01 s`.
- Desplazamiento máximo positivo.
- Energía acumulada calculada.
- Primera gráfica: desplazamiento RK4.
- Segunda gráfica: RK2, RK4 y referencia libre.

### ESTRÉS

Comprobar una respuesta con mayor amplitud y menor amortiguamiento.

### MAL CONDICIONADO

Comprobar el amortiguamiento débil `0.02`, que produce una respuesta más persistente y permite diferenciar estabilidad numérica de riesgo físico.

## 6. Evaluación del Módulo 4 - Sensores

Ruta: `http://localhost:5173/modulo-4`

### NORMAL

Usar:

- Paso `0.25`.
- Nueve nodos.
- Ruido cero.

Comprobar:

- Tres puntos ocultos recuperados.
- Comparación con `sin(t)`.
- Lagrange.
- Newton por diferencias divididas.
- Spline cúbico natural.
- Tabla de errores por método.
- Primera gráfica: reconstrucción frente a referencia.
- Segunda gráfica: error medio por método.

### ESTRÉS

Usar paso `0.5` y ruido instrumental pequeño.

Comprobar cómo cambia el error entre los tres métodos.

### MAL CONDICIONADO

Usar paso `1.5` y ruido mayor.

Comprobar:

- Pocos nodos.
- Mayor separación entre nodos.
- Ruido mayor.
- Incremento cuantitativo del error.
- Diferencia entre método estable e interpolación sensible.

## 7. Guardar y recuperar una simulación

Repetir en los módulos 1, 2, 3 y 4:

1. Ejecutar un escenario.
2. Ingresar una etiqueta.
3. Pulsar `Guardar como nueva`.
4. Verificar que el historial muestra la simulación.
5. Pulsar `Abrir`.
6. Confirmar que el escenario y los parámetros reaparecen.
7. Pulsar `Relanzar`.
8. Confirmar que los métodos guardados coinciden con los recalculados.
9. Pulsar `Actualizar` si se modificaron parámetros.
10. Pulsar `Eliminar` y confirmar que desaparece del historial.

También puede verificarse desde PostgREST:

```sh
curl.exe http://localhost:3000/simulacion?select=id,etiqueta_usuario,estado&order=id.desc
curl.exe http://localhost:3000/ejecucion_metodo?select=id,metodo,convergio,iteraciones_totales&order=id.desc
curl.exe http://localhost:3000/resultado_resumen?select=id,error_absoluto_final,interpretacion&order=id.desc
```

---

# Informe de experimentos y fallos detectados

## Información general

- **Proyecto:** SIMTELE-RISK.
- **Materia:** INF-373 - Métodos Numéricos.
- **Gestión:** II / 2026.
- **Semana evaluada:** 2.
- **Fecha de ejecución:** completar.
- **Equipo evaluador:** completar.
- **Repositorio:** https://github.com/Vidnewgen/simtele-risk-proyecto-inf-373
- **Rama evaluada:** completar.
- **Aplicación:** `http://localhost:5173` o enlace público.

## Resultados generales

| Verificación | Resultado |
|---|---|
| Docker Compose activo | Aprobado |
| PostgreSQL operativo | Aprobado |
| PostgREST operativo | Aprobado |
| Adminer operativo | Aprobado |
| Cuatro rutas HTTP disponibles | Aprobado |
| Prueba automatizada | 28 pruebas aprobadas |
| Compilación y type-check | Aprobado |
| Dos gráficas por módulo | Aprobado |
| Tres escenarios por módulo | Aprobado |
| Guardar simulación | Aprobado |
| Recuperar simulación | Aprobado |
| Relanzar y verificar | Aprobado |
| Actualizar y eliminar | Aprobado |

## Evidencia automática

Ejecutar:

```sh
npm test
npm run build
docker compose ps
```

Anotar:

- Número de pruebas aprobadas.
- Resultado del type-check.
- Resultado de la compilación Vite.
- Estado de los contenedores.

## Evidencia de la aplicación

Adjuntar capturas de:

1. Página principal.
2. Módulo 1 con sus dos gráficas.
3. Módulo 2 con tabla lineal y tabla de raíces.
4. Módulo 3 con sus dos gráficas.
5. Módulo 4 con comparación de interpolación.
6. Historial vacío antes de guardar.
7. Simulación guardada.
8. Simulación recuperada.
9. Resultado de relanzamiento.
10. Tablas de PostgREST o Adminer.

## Experimentos por módulo

### Módulo 1 - Detención

| Escenario | Resultado principal | Referencia | Error observado | Interpretación |
|---|---:|---:|---:|---|
| NORMAL | completar | completar | completar | completar |
| ESTRÉS | completar | completar | completar | completar |
| MAL CONDICIONADO | completar | completar | completar | completar |

Métodos evaluados:

- Bisección.
- Trapecio compuesto.
- Simpson 1/3.
- Romberg.
- RK2.
- RK4.

### Módulo 2 - Deterioro

| Escenario | Raíz analítica | Sistemas lineales | Método de raíz más rápido | Observación |
|---|---:|---|---|---|
| NORMAL | completar | completar | completar | completar |
| ESTRÉS | completar | completar | completar | completar |
| MAL CONDICIONADO | completar | completar | completar | completar |

Documentar:

- Iteraciones.
- Residuales.
- Errores absoluto, relativo y porcentual.
- Número de condición.
- Sensibilidad.
- Divergencias o falta de convergencia.

### Módulo 3 - Viento

| Escenario | Desplazamiento máximo | Energía proxy | Paso RK | Observación |
|---|---:|---:|---:|---|
| NORMAL | completar | completar | completar | completar |
| ESTRÉS | completar | completar | completar | completar |
| MAL CONDICIONADO | completar | completar | completar | completar |

### Módulo 4 - Sensores

| Escenario | Lagrange | Newton-DD | Spline cúbico | Observación |
|---|---:|---:|---:|---|
| NORMAL | completar | completar | completar | completar |
| ESTRÉS | completar | completar | completar | completar |
| MAL CONDICIONADO | completar | completar | completar | completar |

## Persistencia verificada

Registrar una simulación por módulo:

| Módulo | Etiqueta usada | ID guardado | Abrir | Actualizar | Relanzar | Eliminar |
|---|---|---:|---|---|---|---|
| M1 | completar | completar | | | | |
| M2 | completar | completar | | | | |
| M3 | completar | completar | | | | |
| M4 | completar | completar | | | | |

La persistencia debe conservar:

- Escenario.
- Parámetros.
- Métodos ejecutados.
- Iteraciones.
- Resultados.
- Referencias.
- Errores.
- Conclusiones.

## Fallos detectados

Crear una fila por cada problema encontrado:

| Problema | Módulo | Reproducción | Causa observada | Estado |
|---|---|---|---|---|
| Completar | completar | completar | completar | Corregido / Pendiente |

Ejemplos de fallos válidos:

- Método que no converge.
- Derivada casi nula.
- Matriz mal condicionada.
- Nodo desfavorable.
- Error al guardar o cargar.
- Valor fuera de rango no validado.
- Gráfica sin datos.

No registrar como corregido un fallo sin una prueba o captura posterior.

## Conclusiones

### Conclusión numérica

Describir:

- Métodos con mayor precisión.
- Métodos más rápidos.
- Sensibilidad observada.
- Casos con convergencia limitada.
- Error o residuo dominante.

### Conclusión del fenómeno

Describir:

- Interpretación sintética de los escenarios.
- Diferencia entre mal condicionamiento matemático y riesgo físico.
- Limitaciones de inferencia.
- Qué no demuestra el sistema frente a equipos reales.

## Calificación esperada de la Semana 2

| Criterio | Puntuación |
|---|---:|
| Interpolación, raíces, integración y EDO | completar / 5 |
| Escenarios, tablas, gráficos y validación | completar / 2 |
| Aplicación, DER y persistencia | completar / 2 |
| **Total** | **completar / 9** |

## Pendientes para Semana 3

- Validar las doce combinaciones módulo/escenario.
- Consolidar el DER definitivo.
- Completar persistencia y verificaciones reproducibles.
- Preparar conclusiones finales.
- Preparar demostración de video.
- Preparar defensa oral.
