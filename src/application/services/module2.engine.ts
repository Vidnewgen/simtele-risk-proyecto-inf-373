import { absoluteError, percentageError, relativeError, type Vector } from '@/domain/math/errors'
import {
    conditionNumberSPD,
    conjugateGradient,
    gaussSeidel,
    jacobi,
    luSolve,
    matVec,
    residualNorm,
    type Matrix,
    type SolveResult,
} from '@/domain/math/linear'
import {
    METHOD_LABELS,
    type IterationRecord,
    type MethodCode,
    type MethodResult,
    type Module2Params,
    type Module2Run,
    type ScenarioType,
} from '@/domain/models/simulation.models'

const PROBLEM_CONCLUSIONS: Record<ScenarioType, string> = {
    NORMAL:
        'Con un sistema bien condicionado, los coeficientes calibrados son estables. Es un caso sintético: no permite inferir el desgaste de equipos reales.',
    ESTRES:
        'Con κ₂ bajo, una perturbación del 5 % en una medición produce un cambio acotado en los coeficientes. Una alta exigencia numérica no implica mal condicionamiento.',
    MAL_CONDICIONADO:
        'Si los datos de calibración generan un sistema así, errores pequeños en los datos pueden amplificarse hasta κ₂ veces. Un residuo pequeño no garantiza un error pequeño.',
}

export function buildMatrix(p: Module2Params): Matrix {
    return Array.from({ length: p.n }, (_, i) =>
        Array.from({ length: p.n }, (_, j) =>
            p.matriz === 'HILBERT' ? 1 / (i + j + 1) : i === j ? 4 : Math.abs(i - j) === 1 ? 1 : 0,
        ),
    )
}

export function buildSystem(p: Module2Params): { A: Matrix; b: Vector; xRef: Vector } {
    const A = buildMatrix(p)
    const b = matVec(A, p.x_ref)
    if (p.perturbacion_b1 !== 0) {
        b[0] = (b[0] as number) * (1 + p.perturbacion_b1)
        const x = luSolve(A, b).x
        if (!x) throw new Error('No se pudo calcular la referencia directa')
        return { A, b, xRef: x }
    }
    return { A, b, xRef: [...p.x_ref] }
}

function toResult(
    method: MethodCode,
    r: SolveResult,
    A: Matrix,
    b: Vector,
    xRef: Vector,
): MethodResult {
    if (!r.x) {
        return {
            method,
            converged: false,
            iterations: r.iterations,
            solution: null,
            residualNorm: null,
            absoluteError: null,
            relativeError: null,
            percentageError: null,
            timeMs: r.timeMs,
        }
    }
    const rel = relativeError(r.x, xRef)
    return {
        method,
        converged: r.converged,
        iterations: r.iterations,
        solution: r.x,
        residualNorm: residualNorm(A, b, r.x),
        absoluteError: absoluteError(r.x, xRef),
        relativeError: rel,
        percentageError: percentageError(rel),
        timeMs: r.timeMs,
    }
}

function numericalConclusion(results: MethodResult[], kappa: number | null): string {
    const parts = [`κ₂(A) = ${kappa === null ? 'no disponible' : kappa.toPrecision(5)}.`]
    const best = results
        .filter((r) => r.converged && r.method !== 'LU')
        .sort((a, b) => a.iterations - b.iterations)[0]
    if (best) {
        parts.push(
            `Entre los iterativos que convergieron, ${METHOD_LABELS[best.method]} necesitó menos iteraciones (${best.iterations}).`,
        )
    }
    const diverged = results.filter((r) => r.solution === null).map((r) => METHOD_LABELS[r.method])
    if (diverged.length) parts.push(`Divergió: ${diverged.join(', ')}.`)
    const stalled = results
        .filter((r) => !r.converged && r.solution !== null)
        .map((r) => METHOD_LABELS[r.method])
    if (stalled.length) {
        parts.push(`No alcanzó la tolerancia en el máximo de iteraciones: ${stalled.join(', ')}.`)
    }
    return parts.join(' ')
}

export function runModule2(
    type: ScenarioType,
    escenarioId: number,
    meta: { title: string; description: string },
    params: Module2Params,
): Module2Run {
    const { A, b, xRef } = buildSystem(params)
    const tol = params.tolerancia
    const maxIter = params.max_iter
    const kappa = conditionNumberSPD(A)

    const histories: Partial<Record<MethodCode, IterationRecord[]>> = {}
    const rec = (m: MethodCode) => {
        const h: IterationRecord[] = []
        histories[m] = h
        return (k: number, x: Vector, residual: number) => {
            h.push({ k, x: [...x], residual })
        }
    }

    const results: MethodResult[] = [
        toResult('JACOBI', jacobi(A, b, tol, maxIter, rec('JACOBI')), A, b, xRef),
        toResult('GAUSS_SEIDEL', gaussSeidel(A, b, tol, maxIter, rec('GAUSS_SEIDEL')), A, b, xRef),
        toResult(
            'GRADIENTE_CONJUGADO',
            conjugateGradient(A, b, tol, maxIter, rec('GRADIENTE_CONJUGADO')),
            A,
            b,
            xRef,
        ),
        toResult('LU', luSolve(A, b), A, b, xRef),
    ]

    return {
        escenarioId,
        params,
        histories,
        data: {
            type,
            title: meta.title,
            description: meta.description,
            conditionNumber: kappa,
            tolerance: tol,
            maxIterations: maxIter,
            matrixA: A,
            vectorB: b,
            exactSolution: xRef,
            results,
            numericalConclusion: numericalConclusion(results, kappa),
            problemConclusion: PROBLEM_CONCLUSIONS[type],
        },
    }
}