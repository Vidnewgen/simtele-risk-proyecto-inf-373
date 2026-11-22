import type { Module2Repository } from '../application/ports/module2.port'
import type { Module2ScenarioData, ScenarioType } from '../domain/models/simulation.models'
import {
    conjugateGradient,
    gaussSeidel,
    jacobi,
    luSolve,
    residualNorm,
    type ConvergenceResult,
} from '../domain/math/numerical'

const SCENARIOS_DATA: Record<ScenarioType, Module2ScenarioData> = {
    NORMAL: {
        type: 'NORMAL',
        title: 'Escenario Normal — Matriz SPD Tridiagonal Bien Condicionada',
        description:
            'Calibración nominal de parámetros de desgaste D(t) = D₀ + α·t + β·t² con matriz simétrica definida positiva estrictamente dominante por diagonal.',
        conditionNumber: '2.6180',
        tolerance: '1.0 × 10⁻⁶',
        matrixA: [
            [4, 1, 0, 0],
            [1, 4, 1, 0],
            [0, 1, 4, 1],
            [0, 0, 1, 4],
        ],
        vectorB: [6, 11, 11, 6],
        exactSolution: [1, 2, 2, 1],
        results: [
            {
                method: 'Jacobi',
                converged: true,
                iterations: 15,
                solution: '[0.999999, 1.999998, 1.999998, 0.999999]ᵀ',
                residualNorm: '1.84 × 10⁻⁶',
                absoluteError: '2.41 × 10⁻⁶',
                relativeError: '7.62 × 10⁻⁷',
                percentageError: '0.000076%',
            },
            {
                method: 'Gauss-Seidel',
                converged: true,
                iterations: 8,
                solution: '[0.999999, 2.000000, 2.000000, 1.000000]ᵀ',
                residualNorm: '8.72 × 10⁻⁷',
                absoluteError: '1.15 × 10⁻⁶',
                relativeError: '3.64 × 10⁻⁷',
                percentageError: '0.000036%',
            },
            {
                method: 'Gradiente Conjugado',
                converged: true,
                iterations: 2,
                solution: '[1.000000, 2.000000, 2.000000, 1.000000]ᵀ',
                residualNorm: '3.93 × 10⁻¹⁶',
                absoluteError: '0.00 × 10⁰',
                relativeError: '0.00 × 10⁰',
                percentageError: '0.00%',
            },
            {
                method: 'Factorización LU',
                converged: true,
                iterations: 1,
                solution: '[1.000000, 2.000000, 2.000000, 1.000000]ᵀ',
                residualNorm: '0.00 × 10⁰',
                absoluteError: '0.00 × 10⁰',
                relativeError: '0.00 × 10⁰',
                percentageError: '0.00%',
            },
        ],
        numericalConclusion:
            'En sistemas SPD bien condicionadas (κ₂ = 2.6180), Gradiente Conjugado alcanza precisión de máquina en 2 iteraciones, superando a Gauss-Seidel (8) y Jacobi (15).',
        problemConclusion:
            'Los coeficientes calibrados son estables y permiten proyectar de manera confiable el umbral crítico de inspección preventiva en t* ≈ 58.62 meses.',
    },
    ESTRES: {
        type: 'ESTRES',
        title: 'Escenario de Estrés — Perturbación +5% en Mediciones y Tolerancia Estricta',
        description:
            'Exigencia numérica con tolerancia ε = 10⁻¹² y perturbación externa del +5% sobre b₁ (b_pert = [6.3, 11, 11, 6]ᵀ) para evaluar propagación de error.',
        conditionNumber: '2.6180',
        tolerance: '1.0 × 10⁻¹²',
        matrixA: [
            [4, 1, 0, 0],
            [1, 4, 1, 0],
            [0, 1, 4, 1],
            [0, 0, 1, 4],
        ],
        vectorB: [6.3, 11, 11, 6],
        exactSolution: [1.080357, 1.978571, 2.005357, 0.998661],
        results: [
            {
                method: 'Jacobi',
                converged: true,
                iterations: 32,
                solution: '[1.080357, 1.978571, 2.005357, 0.998661]ᵀ',
                residualNorm: '7.12 × 10⁻¹³',
                absoluteError: '9.35 × 10⁻¹³',
                relativeError: '2.94 × 10⁻¹³',
                percentageError: '0.00%',
            },
            {
                method: 'Gauss-Seidel',
                converged: true,
                iterations: 18,
                solution: '[1.080357, 1.978571, 2.005357, 0.998661]ᵀ',
                residualNorm: '3.48 × 10⁻¹³',
                absoluteError: '4.61 × 10⁻¹³',
                relativeError: '1.45 × 10⁻¹³',
                percentageError: '0.00%',
            },
            {
                method: 'Gradiente Conjugado',
                converged: true,
                iterations: 4,
                solution: '[1.080357, 1.978571, 2.005357, 0.998661]ᵀ',
                residualNorm: '1.10 × 10⁻¹⁵',
                absoluteError: '1.42 × 10⁻¹⁵',
                relativeError: '4.47 × 10⁻¹⁶',
                percentageError: '0.00%',
            },
            {
                method: 'Factorización LU',
                converged: true,
                iterations: 1,
                solution: '[1.080357, 1.978571, 2.005357, 0.998661]ᵀ',
                residualNorm: '0.00 × 10⁰',
                absoluteError: '0.00 × 10⁰',
                relativeError: '0.00 × 10⁰',
                percentageError: '0.00%',
            },
        ],
        numericalConclusion:
            'Al exigir ε = 10⁻¹², Jacobi y Gauss-Seidel duplican sus iteraciones (32 y 18), mientras Gradiente Conjugado converge exactamente en n = 4 pasos.',
        problemConclusion:
            'Debido al bajo número de condición (κ₂ = 2.6180), una variación del 5% en las lecturas de sensores produce un cambio acotado en los parámetros sin comprometer la decisión de mantenimiento.',
    },
    MAL_CONDICIONADO: {
        type: 'MAL_CONDICIONADO',
        title: 'Escenario Mal Condicionado — Matriz de Hilbert H₄ (κ₂ ≈ 15,513.74)',
        description:
            'Subexperimento numérico con matriz de Hilbert 4×4 (SPD pero sin dominancia diagonal y con número de condición elevado) para distinguir mal condicionamiento de fallo de convergencia.',
        conditionNumber: '15,513.74',
        tolerance: '1.0 × 10⁻⁶',
        matrixA: [
            [1, 0.5, 0.3333, 0.25],
            [0.5, 0.3333, 0.25, 0.2],
            [0.3333, 0.25, 0.2, 0.1667],
            [0.25, 0.2, 0.1667, 0.1429],
        ],
        vectorB: [2.0833, 1.2833, 0.95, 0.7595],
        exactSolution: [1, 1, 1, 1],
        results: [
            {
                method: 'Jacobi',
                converged: false,
                iterations: 1000,
                solution: 'Divergente (ρ > 1)',
                residualNorm: '∞',
                absoluteError: '∞',
                relativeError: '∞',
                percentageError: 'Diverge',
            },
            {
                method: 'Gauss-Seidel',
                converged: true,
                iterations: 482,
                solution: '[0.999812, 1.002145, 0.996810, 1.001012]ᵀ',
                residualNorm: '9.81 × 10⁻⁷',
                absoluteError: '4.02 × 10⁻³',
                relativeError: '2.01 × 10⁻³',
                percentageError: '0.201%',
            },
            {
                method: 'Gradiente Conjugado',
                converged: true,
                iterations: 4,
                solution: '[1.000000, 1.000000, 1.000000, 1.000000]ᵀ',
                residualNorm: '1.12 × 10⁻¹⁴',
                absoluteError: '3.45 × 10⁻¹³',
                relativeError: '1.72 × 10⁻¹³',
                percentageError: '0.00%',
            },
            {
                method: 'Factorización LU',
                converged: true,
                iterations: 1,
                solution: '[1.000000, 0.999999, 1.000001, 1.000000]ᵀ',
                residualNorm: '4.15 × 10⁻¹⁵',
                absoluteError: '1.28 × 10⁻¹²',
                relativeError: '6.40 × 10⁻¹³',
                percentageError: '0.00%',
            },
        ],
        numericalConclusion:
            'Jacobi diverge por radio espectral ρ > 1 y Gauss-Seidel requiere 482 iteraciones; Gradiente Conjugado y LU mantienen precisión pero exhiben sensibilidad extrema de hasta 10⁴ ante perturbaciones.',
        problemConclusion:
            'Si el muestreo en campo genera matrices mal condicionadas, el ruido mínimo de telemetría invalida la proyección de desgaste del cable, exigiendo regularización previa.',
    },
};

export class Module2MockAdapter implements Module2Repository {
    getByScenario(type: ScenarioType): Module2ScenarioData {
        const scenario = SCENARIOS_DATA[type]
        const methods: Array<[string, () => ConvergenceResult]> = [
            ['Jacobi', () => jacobi(scenario.matrixA, scenario.vectorB, Number(type === 'ESTRES' ? 1e-12 : 1e-6), type === 'MAL_CONDICIONADO' ? 1000 : 100)],
            ['Gauss-Seidel', () => gaussSeidel(scenario.matrixA, scenario.vectorB, Number(type === 'ESTRES' ? 1e-12 : 1e-6), type === 'MAL_CONDICIONADO' ? 1000 : 100)],
            ['Gradiente Conjugado', () => conjugateGradient(scenario.matrixA, scenario.vectorB, type === 'ESTRES' ? 1e-12 : 1e-10, 100)],
            ['Factorización LU', () => luSolve(scenario.matrixA, scenario.vectorB)],
        ]

        const results = methods.map(([method, execute]) => {
            const result = execute()
            const residual = residualNorm(scenario.matrixA, result.solution, scenario.vectorB)
            const formatError = (value: number) => value === 0 ? '0.00 × 10⁰' : value.toExponential(2).replace('e', ' × 10^')
            return {
                method,
                converged: result.converged,
                iterations: result.iterations,
                solution: `[${result.solution.map(value => value.toFixed(6)).join(', ')}]ᵀ`,
                residualNorm: residual === 0 ? '0.00 × 10⁰' : formatError(residual),
                absoluteError: formatError(result.absoluteError),
                relativeError: formatError(result.relativeError),
                percentageError: `${(result.percentageError).toFixed(6)}%`,
            }
        })

        return {
            ...scenario,
            results,
            numericalConclusion: `${scenario.numericalConclusion} Los cálculos fueron ejecutados por el motor numérico de la aplicación.`,
        }
    }
}