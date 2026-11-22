export type ScenarioType = 'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO'

export type MethodCode =
    | 'JACOBI'
    | 'GAUSS_SEIDEL'
    | 'LU'
    | 'GRADIENTE_CONJUGADO'

export const METHOD_LABELS: Record<MethodCode, string> = {
    JACOBI: 'Jacobi',
    GAUSS_SEIDEL: 'Gauss-Seidel',
    LU: 'Factorización LU',
    GRADIENTE_CONJUGADO: 'Gradiente Conjugado',
}

export interface MethodResult {
    method: MethodCode
    converged: boolean
    iterations: number
    solution: number[] | null // null si divergió
    residualNorm: number | null // null en vez de Infinity
    absoluteError: number | null
    relativeError: number | null
    percentageError: number | null
    timeMs: number
}

export interface Module2ScenarioData {
    type: ScenarioType
    title: string
    description: string
    conditionNumber: number | null
    tolerance: number
    maxIterations: number
    matrixA: number[][]
    vectorB: number[]
    exactSolution: number[]
    results: MethodResult[]
    numericalConclusion: string
    problemConclusion: string
}

export interface IterationRecord {
    k: number
    x: number[]
    residual: number
}

export interface Module2Params {
    matriz: 'TRIDIAGONAL' | 'HILBERT'
    n: number
    x_ref: number[]
    perturbacion_b1: number
    tolerancia: number
    max_iter: number
}

export interface Module2Run {
    escenarioId: number
    params: Module2Params
    data: Module2ScenarioData
    histories: Partial<Record<MethodCode, IterationRecord[]>>
}

export interface SimulationSummary {
    id: number
    etiqueta: string | null
    tipo: ScenarioType
    creadoEn: string
}