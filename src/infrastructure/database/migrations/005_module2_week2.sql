-- Borra simulaciones de prueba hechas con el formato anterior de parámetros
DELETE FROM simulacion;

UPDATE escenario SET
  nombre = 'Normal: matriz SPD bien condicionada y umbral de inspección',
  descripcion = 'Calibración nominal D(t) = D0 + αt + βt² (matriz SPD diagonal dominante) y tiempo al umbral con bisección, Newton y secante. Datos sintéticos con referencia analítica.',
  parametros_defecto = '{"matriz":"TRIDIAGONAL","n":4,"x_ref":[1,2,2,1],"perturbacion_b1":0,"D0":10,"alpha":0.5,"beta":0.01,"D_umbral":100,"t_inspeccion":60,"a":0,"b":200,"x0":50,"s0":40,"s1":120,"tolerancia":1e-6,"max_iter":10000}'::jsonb,
  fuente_datos = 'Sintético: tridiagonal (4,1), b = A·x*, D(t) cuadrática con raíz analítica'
WHERE tipo = 'NORMAL'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M2');

UPDATE escenario SET
  nombre = 'Estrés: perturbación +5% en b1, tolerancia 1e-12 e inspección retrasada',
  descripcion = 'Tolerancia 1e-12, perturbación del 5% en b1, deterioro más severo y inspección programada en t = 72 (después del umbral).',
  parametros_defecto = '{"matriz":"TRIDIAGONAL","n":4,"x_ref":[1,2,2,1],"perturbacion_b1":0.05,"D0":10,"alpha":0.6,"beta":0.015,"D_umbral":100,"t_inspeccion":72,"a":0,"b":200,"x0":150,"s0":0,"s1":200,"tolerancia":1e-12,"max_iter":10000}'::jsonb,
  fuente_datos = 'Sintético: mismo sistema con b1 x 1.05 y D(t) con raíz exacta t* = 60'
WHERE tipo = 'ESTRES'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M2');

UPDATE escenario SET
  nombre = 'Mal condicionado: Hilbert H4 y raíz doble en D(t) - D_umbral',
  descripcion = 'Subexperimento numérico: H4 (κ₂ ≈ 1.55e4) y curva D(t) tangente al umbral (raíz doble en t = 60). Distingue mal condicionamiento de falta de convergencia.',
  parametros_defecto = '{"matriz":"HILBERT","n":4,"x_ref":[1,1,1,1],"perturbacion_b1":0,"D0":64,"alpha":1.2,"beta":-0.01,"D_umbral":100,"t_inspeccion":60,"a":0,"b":120,"x0":30,"s0":20,"s1":40,"tolerancia":1e-6,"max_iter":10000}'::jsonb,
  fuente_datos = 'Sintético: H(i,j) = 1/(i+j+1), b = H·x*, D(t) - 100 = -0.01 (t - 60)²'
WHERE tipo = 'MAL_CONDICIONADO'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M2');