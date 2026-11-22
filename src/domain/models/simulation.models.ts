export type ScenarioType = 'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO'

export type LinearMethodCode = 'JACOBI' | 'GAUSS_SEIDEL' | 'LU' | 'GRADIENTE_CONJUGADO'
export type RootMethodCode = 'BISECCION' | 'NEWTON_RAPHSON' | 'SECANTE'
export type MethodCode = LinearMethodCode | RootMethodCode

export const LINEAR_METHODS: LinearMethodCode[] = [
    'JACOBI',
    'GAUSS_SEIDEL',
    'GRADIENTE_CONJUGADO',
    'LU',
]
export const ROOT_METHODS: RootMethodCode[] = ['BISECCION', 'NEWTON_RAPHSON', 'SECANTE']

export const METHOD_LABELS: Record<MethodCode, string> = {
    JACOBI: 'Jacobi',
    GAUSS_SEIDEL: 'Gauss-Seidel',
    LU: 'Factorización LU',
    GRADIENTE_CONJUGADO: 'Gradiente Conjugado',
    BISECCION: 'Bisección',
    NEWTON_RAPHSON: 'Newton-Raphson',
    SECANTE: 'Secante',
}

export interface MethodResult {
    method: LinearMethodCode
    converged: boolean
    iterations: number
    solution: number[] | null // null si divergió
    residualNorm: number | null
    absoluteError: number | null
    relativeError: number | null
    percentageError: number | null
    timeMs: number
}

export interface RootResult {
    method: RootMethodCode
    converged: boolean
    iterations: number
    root: number | null
    fRoot: number | null
    absoluteError: number | null
    relativeError: number | null
    percentageError: number | null
    timeMs: number
    note: string
}

export interface RootSensitivity {
    delta: number
    perturbedRoot: number | null
    shift: number | null
    amplification: number | null
}

export interface DeteriorationAnalysis {
    analyticRoot: number | null
    discriminant: number
    dAtInspection: number
    marginMonths: number | null
    sensitivity: RootSensitivity
}

export interface RootAnalysis extends DeteriorationAnalysis {
    results: RootResult[]
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
    roots: RootAnalysis
    numericalConclusion: string
    problemConclusion: string
}

export interface IterationRecord {
    k: number
    x: number[] // vector (sistemas lineales) o [x_k] (raíces)
    residual: number // ‖b − Ax‖₂ o |f(x_k)|
    fx: number | null // solo raíces
    error: number | null // error absoluto frente a la referencia
}

export interface Module2Params {
    matriz: 'TRIDIAGONAL' | 'HILBERT'
    n: number
    x_ref: number[]
    perturbacion_b1: number
    D0: number
    alpha: number
    beta: number
    D_umbral: number
    t_inspeccion: number
    a: number
    b: number
    x0: number
    s0: number
    s1: number
    tolerancia: number
    max_iter: number
}

export interface Module2Run {
    escenarioId: number
    params: Module2Params
    data: Module2ScenarioData
    histories: Partial<Record<MethodCode, IterationRecord[]>>
}

export interface ScenarioInfo {
    id: number
    tipo: ScenarioType
    nombre: string
    descripcion: string
    fuente: string
    params: Module2Params
}

export interface SaveMeta {
    label?: string
    equipo?: string
}

export interface SimulationSummary {
    id: number
    etiqueta: string | null
    equipo: string | null
    tipo: ScenarioType
    estado: string
    creadoEn: string
}

export interface SavedSimulation {
    id: number
    etiqueta: string | null
    equipo: string | null
    estado: string
    creadoEn: string
    tipo: ScenarioType
    run: Module2Run
}

export interface VerificationRow {
    method: MethodCode
    iterationsStored: number
    iterationsFresh: number | null
    maxDiff: number | null
    ok: boolean
}

export interface VerificationReport {
    ok: boolean
    tolerance: number
    rows: VerificationRow[]
}