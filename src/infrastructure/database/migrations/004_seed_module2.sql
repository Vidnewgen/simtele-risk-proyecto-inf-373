UPDATE escenario SET
  nombre = 'Normal: matriz SPD tridiagonal bien condicionada',
  descripcion = 'Calibración nominal de D(t) = D0 + αt + βt² con matriz SPD diagonal dominante. Datos sintéticos con x* conocido (b = A·x*).',
  parametros_defecto = '{"matriz":"TRIDIAGONAL","n":4,"x_ref":[1,2,2,1],"perturbacion_b1":0,"tolerancia":1e-6,"max_iter":10000}'::jsonb,
  fuente_datos = 'Sintético: matriz tridiagonal (4,1) y b = A·x*'
WHERE tipo = 'NORMAL' AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M2');

UPDATE escenario SET
  nombre = 'Estrés: perturbación +5% en b1 y tolerancia estricta',
  descripcion = 'Tolerancia 1e-12 y perturbación del 5% en b1. La referencia es la solución directa (LU) del sistema perturbado.',
  parametros_defecto = '{"matriz":"TRIDIAGONAL","n":4,"x_ref":[1,2,2,1],"perturbacion_b1":0.05,"tolerancia":1e-12,"max_iter":10000}'::jsonb,
  fuente_datos = 'Sintético: mismo sistema con b1 multiplicado por 1.05'
WHERE tipo = 'ESTRES' AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M2');

UPDATE escenario SET
  nombre = 'Mal condicionado: matriz de Hilbert H4',
  descripcion = 'Subexperimento numérico con H4 (SPD, sin dominancia diagonal, κ₂ ≈ 1.55e4) para distinguir mal condicionamiento de falta de convergencia.',
  parametros_defecto = '{"matriz":"HILBERT","n":4,"x_ref":[1,1,1,1],"perturbacion_b1":0,"tolerancia":1e-6,"max_iter":10000}'::jsonb,
  fuente_datos = 'Sintético: H(i,j) = 1/(i+j+1) y b = H·x*'
WHERE tipo = 'MAL_CONDICIONADO' AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M2');