UPDATE escenario SET
  descripcion = 'Detención sintética con referencia analítica v=v0-at.',
  parametros_defecto = '{"v0":20,"acceleration":2}'::jsonb,
  fuente_datos = 'Datos sintéticos reproducibles'
WHERE tipo = 'NORMAL'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M1');

UPDATE escenario SET
  descripcion = 'Detención sintética exigente con velocidad inicial 24 y desaceleración 2.8.',
  parametros_defecto = '{"v0":24,"acceleration":2.8}'::jsonb,
  fuente_datos = 'Datos sintéticos reproducibles'
WHERE tipo = 'ESTRES'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M1');

UPDATE escenario SET
  descripcion = 'Detención sintética mal condicionada numéricamente por desaceleración pequeña.',
  parametros_defecto = '{"v0":24,"acceleration":0.4}'::jsonb,
  fuente_datos = 'Datos sintéticos reproducibles'
WHERE tipo = 'MAL_CONDICIONADO'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M1');

UPDATE escenario SET
  descripcion = 'Oscilaciones subamortiguadas con fuerza cosenoidal sintética.',
  parametros_defecto = '{"mass":1,"damping":1.2,"stiffness":4,"amplitude":1}'::jsonb,
  fuente_datos = 'Datos sintéticos reproducibles'
WHERE tipo = 'NORMAL'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M3');

UPDATE escenario SET
  descripcion = 'Oscilaciones exigentes con mayor amplitud y menor amortiguamiento.',
  parametros_defecto = '{"mass":1,"damping":0.8,"stiffness":4,"amplitude":3}'::jsonb,
  fuente_datos = 'Datos sintéticos reproducibles'
WHERE tipo = 'ESTRES'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M3');

UPDATE escenario SET
  descripcion = 'Oscilaciones con amortiguamiento débil para estudiar sensibilidad dinámica.',
  parametros_defecto = '{"mass":1,"damping":0.02,"stiffness":4,"amplitude":3}'::jsonb,
  fuente_datos = 'Datos sintéticos reproducibles'
WHERE tipo = 'MAL_CONDICIONADO'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M3');

UPDATE escenario SET
  descripcion = 'Reconstrucción de sin(t) con nueve nodos espaciados 0.25.',
  parametros_defecto = '{"step":0.25,"hiddenTestCount":3}'::jsonb,
  fuente_datos = 'Datos sintéticos sin(t)'
WHERE tipo = 'NORMAL'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M4');

UPDATE escenario SET
  descripcion = 'Reconstrucción con nodos espaciados 0.5 y perturbación instrumental.',
  parametros_defecto = '{"step":0.5,"hiddenTestCount":3,"noise":"sin(index*4.1)*0.08"}'::jsonb,
  fuente_datos = 'Datos sintéticos sin(t) con ruido'
WHERE tipo = 'ESTRES'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M4');

UPDATE escenario SET
  descripcion = 'Reconstrucción con nodos espaciados 1.5 y ruido mayor.',
  parametros_defecto = '{"step":1.5,"hiddenTestCount":3,"noise":"sin(index*2.7)*0.25"}'::jsonb,
  fuente_datos = 'Datos sintéticos sin(t) con ruido desfavorable'
WHERE tipo = 'MAL_CONDICIONADO'
  AND caso_estudio_id = (SELECT id FROM caso_estudio WHERE codigo = 'M4');
