INSERT INTO caso_estudio (codigo, nombre, descripcion, modelo_matematico) VALUES
('M1','Detención de emergencia','Tiempo y distancia de frenado de cabinas','dx/dt=v; dv/dt=-a(v,t)'),
('M2','Deterioro y mantenimiento','Tiempo al umbral de inspección','D(t)=D0+αt+βt²'),
('M3','Oscilaciones por viento','Respuesta ante fuerza externa y amortiguamiento','x''=v; v''=(F(t)-cv-kx)/m'),
('M4','Reconstrucción de sensores','Interpolación de registros faltantes con ruido','y(t)=sin(t) / e^(-t)');

-- 3 escenarios por caso (12 en total); ajusta los JSON cuando definas los parámetros
INSERT INTO escenario (caso_estudio_id, tipo, nombre, descripcion, parametros_defecto, fuente_datos)
SELECT c.id, t.tipo, c.nombre || ' - ' || t.tipo, 'Por definir', '{}'::jsonb, 'Datos sintéticos'
FROM caso_estudio c
CROSS JOIN (VALUES ('NORMAL'),('ESTRES'),('MAL_CONDICIONADO')) AS t(tipo);