CREATE TABLE
    caso_estudio (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        codigo VARCHAR(20) NOT NULL UNIQUE,
        nombre VARCHAR(120) NOT NULL,
        descripcion TEXT NOT NULL,
        modelo_matematico TEXT NOT NULL,
        modelo_version VARCHAR(30) NOT NULL DEFAULT '1.0'
    );

CREATE TABLE
    escenario (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        caso_estudio_id INTEGER NOT NULL REFERENCES caso_estudio (id) ON DELETE CASCADE,
        tipo VARCHAR(30) NOT NULL,
        nombre VARCHAR(120) NOT NULL,
        descripcion TEXT NOT NULL,
        parametros_defecto JSONB NOT NULL,
        fuente_datos TEXT NOT NULL,
        UNIQUE (caso_estudio_id, tipo),
        CHECK (tipo IN ('NORMAL', 'ESTRES', 'MAL_CONDICIONADO'))
    );

CREATE TABLE
    simulacion (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        escenario_id INTEGER NOT NULL REFERENCES escenario (id) ON DELETE RESTRICT,
        etiqueta_usuario VARCHAR(150),
        equipo VARCHAR(100),
        parametros_entrada JSONB NOT NULL,
        semilla_ruido INTEGER,
        tolerancia DOUBLE PRECISION NOT NULL CHECK (tolerancia > 0),
        max_iteraciones INTEGER NOT NULL CHECK (max_iteraciones > 0),
        estado VARCHAR(30) NOT NULL DEFAULT 'COMPLETADA',
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now (),
        CHECK (
            estado IN (
                'PENDIENTE',
                'EJECUTANDO',
                'COMPLETADA',
                'FALLIDA'
            )
        )
    );

CREATE TABLE
    ejecucion_metodo (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        simulacion_id INTEGER NOT NULL REFERENCES simulacion (id) ON DELETE CASCADE,
        familia_numerica VARCHAR(40) NOT NULL,
        metodo VARCHAR(60) NOT NULL,
        parametros_json JSONB,
        tolerancia DOUBLE PRECISION CHECK (
            tolerancia IS NULL
            OR tolerancia > 0
        ),
        paso DOUBLE PRECISION CHECK (
            paso IS NULL
            OR paso > 0
        ),
        subintervalos INTEGER CHECK (
            subintervalos IS NULL
            OR subintervalos > 0
        ),
        max_iteraciones INTEGER CHECK (
            max_iteraciones IS NULL
            OR max_iteraciones > 0
        ),
        criterio_parada TEXT,
        convergio BOOLEAN NOT NULL DEFAULT FALSE,
        iteraciones_totales INTEGER NOT NULL DEFAULT 0,
        tiempo_ejecucion_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
        CHECK (
            familia_numerica IN (
                'ERRORES',
                'SISTEMAS_LINEALES',
                'INTERPOLACION',
                'RAICES',
                'INTEGRACION',
                'EDO'
            )
        ),
        CHECK (
            metodo IN (
                'JACOBI',
                'GAUSS_SEIDEL',
                'LU',
                'GRADIENTE_CONJUGADO',
                'DIRECTO',
                'LAGRANGE',
                'NEWTON_DD',
                'SPLINE_CUBICO',
                'BISECCION',
                'NEWTON_RAPHSON',
                'SECANTE',
                'TRAPECIO',
                'SIMPSON_13',
                'ROMBERG',
                'RK2',
                'RK4',
                'ANALITICO'
            )
        )
    );

CREATE TABLE
    iteracion_resultado (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        ejecucion_metodo_id INTEGER NOT NULL REFERENCES ejecucion_metodo (id) ON DELETE CASCADE,
        paso_k INTEGER NOT NULL CHECK (paso_k >= 0),
        valor_x DOUBLE PRECISION,
        valor_fx DOUBLE PRECISION,
        valor_json JSONB,
        error_absoluto DOUBLE PRECISION,
        error_relativo DOUBLE PRECISION,
        residual DOUBLE PRECISION,
        detalle_vector JSONB
    );

CREATE TABLE
    resultado_resumen (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        ejecucion_metodo_id INTEGER NOT NULL UNIQUE REFERENCES ejecucion_metodo (id) ON DELETE CASCADE,
        solucion_final_json JSONB NOT NULL,
        valor_referencia_json JSONB,
        error_absoluto_final DOUBLE PRECISION,
        error_relativo_final DOUBLE PRECISION,
        error_porcentual_final DOUBLE PRECISION,
        residual_final DOUBLE PRECISION,
        numero_condicion DOUBLE PRECISION CHECK (
            numero_condicion IS NULL
            OR numero_condicion >= 0
        ),
        interpretacion TEXT
    );

-- Las dos conclusiones que exige el PDF, una vez por simulación
CREATE TABLE
    conclusion_simulacion (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        simulacion_id INTEGER NOT NULL UNIQUE REFERENCES simulacion (id) ON DELETE CASCADE,
        conclusion_numerica TEXT NOT NULL,
        conclusion_problema TEXT NOT NULL
    );

CREATE INDEX idx_escenario_caso ON escenario (caso_estudio_id);

CREATE INDEX idx_simulacion_esc ON simulacion (escenario_id);

CREATE INDEX idx_simulacion_fecha ON simulacion (creado_en DESC);

CREATE INDEX idx_ejecucion_sim ON ejecucion_metodo (simulacion_id);

CREATE INDEX idx_iteracion_ejec ON iteracion_resultado (ejecucion_metodo_id, paso_k);