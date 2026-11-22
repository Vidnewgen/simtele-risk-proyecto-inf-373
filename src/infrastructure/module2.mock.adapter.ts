// import type { Module2Repository } from '@/application/ports/module2.port'
// import {
//     METHOD_LABELS,
//     type MethodCode,
//     type MethodResult,
//     type Module2ScenarioData,
//     type ScenarioType,
// } from '@/domain/models/simulation.models'
// import { absoluteError, percentageError, relativeError, type Vector } from '@/domain/math/errors'
// import {
//     conditionNumberSPD,
//     conjugateGradient,
//     gaussSeidel,
//     jacobi,
//     luSolve,
//     matVec,
//     residualNorm,
//     type Matrix,
//     type SolveResult,
// } from '@/domain/math/linear'

// const TRIDIAGONAL: Matrix = [
//     [4, 1, 0, 0],
//     [1, 4, 1, 0],
//     [0, 1, 4, 1],
//     [0, 0, 1, 4],
// ]

// const hilbert = (n: number): Matrix =>
//     Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => 1 / (i + j + 1)))

// const MAX_ITER = 10000

// function toResult(method: MethodCode, r: SolveResult, A: Matrix, b: Vector, xRef: Vector): MethodResult {
//     if (!r.x) {
//         return {
//             method, converged: false, iterations: r.iterations, solution: null,
//             residualNorm: null, absoluteError: null, relativeError: null,
//             percentageError: null, timeMs: r.timeMs,
//         }
//     }
//     const rel = relativeError(r.x, xRef)
//     return {
//         method,
//         converged: r.converged,
//         iterations: r.iterations,
//         solution: r.x,
//         residualNorm: residualNorm(A, b, r.x),
//         absoluteError: absoluteError(r.x, xRef),
//         relativeError: rel,
//         percentageError: percentageError(rel),
//         timeMs: r.timeMs,
//     }
// }

// function buildNumericalConclusion(results: MethodResult[], kappa: number | null): string {
//     const parts: string[] = [`κ₂(A) = ${kappa === null ? 'no disponible' : kappa.toPrecision(5)}.`]

//     const best = results
//         .filter((r) => r.converged && r.method !== 'LU')
//         .sort((a, b) => a.iterations - b.iterations)[0]
//     if (best) {
//         parts.push(
//             `Entre los iterativos que convergieron, ${METHOD_LABELS[best.method]} necesitó menos iteraciones (${best.iterations}).`,
//         )
//     }
//     const diverged = results.filter((r) => r.solution === null).map((r) => METHOD_LABELS[r.method])
//     if (diverged.length) parts.push(`Divergió: ${diverged.join(', ')}.`)
//     const stalled = results
//         .filter((r) => !r.converged && r.solution !== null)
//         .map((r) => METHOD_LABELS[r.method])
//     if (stalled.length) parts.push(`No alcanzó la tolerancia en el máximo de iteraciones: ${stalled.join(', ')}.`)
//     return parts.join(' ')
// }

// interface ScenarioConfig {
//     title: string
//     description: string
//     A: Matrix
//     b: Vector
//     xRef: Vector
//     tolerance: number
//     problemConclusion: string
// }

// function buildConfig(type: ScenarioType): ScenarioConfig {
//     if (type === 'NORMAL') {
//         const xRef = [1, 2, 2, 1]
//         return {
//             title: 'Escenario Normal — Matriz SPD tridiagonal bien condicionada',
//             description:
//                 'Calibración nominal de D(t) = D₀ + α·t + β·t² con una matriz simétrica definida positiva y diagonal dominante. Datos sintéticos con x* conocido (b = A·x*).',
//             A: TRIDIAGONAL,
//             b: matVec(TRIDIAGONAL, xRef),
//             xRef,
//             tolerance: 1e-6,
//             problemConclusion:
//                 'Con un sistema bien condicionado, los coeficientes calibrados son estables. Es un caso sintético: no permite inferir el desgaste de equipos reales.',
//         }
//     }
//     if (type === 'ESTRES') {
//         const b = matVec(TRIDIAGONAL, [1, 2, 2, 1])
//         b[0] = (b[0] as number) * 1.05 // perturbación de +5 % sobre b₁
//         return {
//             title: 'Escenario Estrés — Perturbación +5 % en b₁ y tolerancia estricta',
//             description:
//                 'Tolerancia 10⁻¹² y perturbación del +5 % en b₁. La referencia es la solución directa del sistema perturbado (LU), por lo que el error de LU es trivial en este escenario.',
//             A: TRIDIAGONAL,
//             b,
//             xRef: luSolve(TRIDIAGONAL, b).x as Vector,
//             tolerance: 1e-12,
//             problemConclusion:
//                 'Con κ₂ bajo, una perturbación del 5 % en una medición produce un cambio acotado en los coeficientes. Una alta exigencia numérica no implica mal condicionamiento.',
//         }
//     }
//     const A = hilbert(4)
//     const xRef = [1, 1, 1, 1]
//     return {
//         title: 'Escenario Mal condicionado — Matriz de Hilbert H₄',
//         description:
//             'Subexperimento numérico con H₄ (SPD, sin dominancia diagonal, κ₂ ≈ 1.55 × 10⁴) para distinguir mal condicionamiento de falta de convergencia.',
//         A,
//         b: matVec(A, xRef),
//         xRef,
//         tolerance: 1e-6,
//         problemConclusion:
//             'Si los datos de calibración generan un sistema así, errores pequeños en los datos pueden amplificarse hasta κ₂ veces. Un residuo pequeño no garantiza un error pequeño.',
//     }
// }

// export class Module2MockAdapter implements Module2Repository {
//     async getByScenario(type: ScenarioType): Promise<Module2ScenarioData> {
//         const cfg = buildConfig(type)
//         const { A, b, xRef, tolerance } = cfg
//         const kappa = conditionNumberSPD(A)

//         const results: MethodResult[] = [
//             toResult('JACOBI', jacobi(A, b, tolerance, MAX_ITER), A, b, xRef),
//             toResult('GAUSS_SEIDEL', gaussSeidel(A, b, tolerance, MAX_ITER), A, b, xRef),
//             toResult('GRADIENTE_CONJUGADO', conjugateGradient(A, b, tolerance, MAX_ITER), A, b, xRef),
//             toResult('LU', luSolve(A, b), A, b, xRef),
//         ]

//         return {
//             type,
//             title: cfg.title,
//             description: cfg.description,
//             conditionNumber: kappa,
//             tolerance,
//             maxIterations: MAX_ITER,
//             matrixA: A,
//             vectorB: b,
//             exactSolution: xRef,
//             results,
//             numericalConclusion: buildNumericalConclusion(results, kappa),
//             problemConclusion: cfg.problemConclusion,
//         }
//     }
// }
