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
    bisection,
    damage,
    firstNonNegativeRoot,
    newtonRaphson,
    secant,
    type RootCallback,
    type RootSolve,
} from '@/domain/math/roots'
import {
    METHOD_LABELS,
    type DeteriorationAnalysis,
    type IterationRecord,
    type LinearMethodCode,
    type MethodCode,
    type MethodResult,
    type Module2Params,
    type Module2Run,
    type RootMethodCode,
    type RootResult,
    type ScenarioType,
    type VerificationReport,
    type VerificationRow,
} from '@/domain/models/simulation.models'

export const SENSITIVITY_DELTA = 1e-6

/* ----------------------------- validación ----------------------------- */

const NUMERIC_KEYS = [
    'D0', 'alpha', 'beta', 'D_umbral', 't_inspeccion', 'a', 'b',
    'x0', 's0', 's1', 'perturbacion_b1', 'tolerancia', 'max_iter',
] as const

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function validateParams(p: Module2Params): string[] {
    const errs: string[] = []
    for (const k of NUMERIC_KEYS) {
        if (!isNum(p[k])) errs.push(`${k}: debe ser un número válido`)
    }
    if (errs.length > 0) return errs

    if (p.D0 < 0) errs.push('D₀ debe ser ≥ 0')
    if (p.alpha < 0) errs.push('α debe ser ≥ 0 (el deterioro no puede disminuir linealmente)')
    if (p.D_umbral <= 0) errs.push('El umbral D_umbral debe ser > 0')
    if (p.D_umbral <= p.D0) errs.push('El umbral debe ser mayor que D₀ (si no, ya está superado en t = 0)')
    if (p.t_inspeccion < 0) errs.push('La inspección programada debe ser ≥ 0')
    if (p.a < 0) errs.push('El extremo a del intervalo debe ser ≥ 0')
    if (p.b <= p.a) errs.push('Se requiere a < b en el intervalo de bisección')
    if (!(p.tolerancia > 0 && p.tolerancia < 1)) errs.push('La tolerancia debe estar en (0, 1), por ejemplo 1e-6')
    if (!Number.isInteger(p.max_iter) || p.max_iter < 1 || p.max_iter > 100000) {
        errs.push('El máximo de iteraciones debe ser un entero entre 1 y 100000')
    }
    if (Math.abs(p.perturbacion_b1) > 0.5) errs.push('La perturbación de b₁ debe estar entre −0.5 y 0.5')
    if (!Number.isInteger(p.n) || p.n < 2) errs.push('n debe ser un entero ≥ 2')
    if (!Array.isArray(p.x_ref) || p.x_ref.length !== p.n || !p.x_ref.every(isNum)) {
        errs.push('x_ref debe tener n valores numéricos')
    }
    if (p.matriz !== 'TRIDIAGONAL' && p.matriz !== 'HILBERT') errs.push('Tipo de matriz no válido')
    return errs
}

/* ------------------------- sistema lineal (A·x = b) ------------------------- */

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
        if (!x) throw new Error('No se pudo calcular la referencia directa del sistema perturbado')
        return { A, b, xRef: x }
    }
    return { A, b, xRef: [...p.x_ref] }
}

function toLinearResult(
    method: LinearMethodCode,
    r: SolveResult,
    A: Matrix,
    b: Vector,
    xRef: Vector,
): MethodResult {
    if (!r.x) {
        return {
            method, converged: false, iterations: r.iterations, solution: null,
            residualNorm: null, absoluteError: null, relativeError: null,
            percentageError: null, timeMs: r.timeMs,
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

/* ------------------------------- raíces ------------------------------- */

/** Referencia analítica, margen frente a la inspección y sensibilidad del umbral. */
export function analyzeDeterioration(p: Module2Params): DeteriorationAnalysis {
    const { root, discriminant } = firstNonNegativeRoot(p.D0 - p.D_umbral, p.alpha, p.beta)
    const dAtInspection = damage(p, p.t_inspeccion)
    const marginMonths = root === null ? null : root - p.t_inspeccion

    let sensitivity = {
        delta: SENSITIVITY_DELTA,
        perturbedRoot: null as number | null,
        shift: null as number | null,
        amplification: null as number | null,
    }
    if (root !== null) {
        // Umbral más bajo en δ: D(t) − (D_umbral − δ) = 0
        const pr = firstNonNegativeRoot(p.D0 - (p.D_umbral - SENSITIVITY_DELTA), p.alpha, p.beta).root
        if (pr !== null) {
            const shift = Math.abs(pr - root)
            sensitivity = {
                delta: SENSITIVITY_DELTA,
                perturbedRoot: pr,
                shift,
                amplification: shift / SENSITIVITY_DELTA,
            }
        }
    }
    return { analyticRoot: root, discriminant, dAtInspection, marginMonths, sensitivity }
}

function toRootResult(method: RootMethodCode, r: RootSolve, analytic: number | null): RootResult {
    const abs = r.root !== null && analytic !== null ? Math.abs(r.root - analytic) : null
    const rel = abs !== null && analytic !== null && analytic !== 0 ? abs / Math.abs(analytic) : null
    return {
        method,
        converged: r.converged,
        iterations: r.iterations,
        root: r.root,
        fRoot: r.fRoot,
        absoluteError: abs,
        relativeError: rel,
        percentageError: percentageError(rel),
        timeMs: r.timeMs,
        note: r.note,
    }
}

/* ------------------------------ conclusiones ------------------------------ */

function linearNumericalText(results: MethodResult[], kappa: number | null): string {
    const parts = [`Sistemas lineales: κ₂(A) = ${kappa === null ? 'no disponible' : kappa.toPrecision(5)}.`]
    const best = results
        .filter((r) => r.converged && r.method !== 'LU')
        .sort((a, b) => a.iterations - b.iterations)[0]
    if (best) {
        parts.push(
            `Entre los iterativos que convergieron, ${METHOD_LABELS[best.method]} necesitó menos iteraciones (${best.iterations}).`,
        )
    }
    const diverged = results.filter((r) => r.solution === null).map((r) => METHOD_LABELS[r.method])
    if (diverged.length > 0) parts.push(`Divergió: ${diverged.join(', ')}.`)
    const stalled = results
        .filter((r) => !r.converged && r.solution !== null)
        .map((r) => METHOD_LABELS[r.method])
    if (stalled.length > 0) {
        parts.push(`No alcanzó la tolerancia en el máximo de iteraciones: ${stalled.join(', ')}.`)
    }
    return parts.join(' ')
}

function rootsNumericalText(results: RootResult[], tol: number): string {
    const parts: string[] = []
    const ok = results.filter((r) => r.converged)
    const best = [...ok].sort((a, b) => a.iterations - b.iterations)[0]
    if (best) {
        parts.push(`Raíces: ${METHOD_LABELS[best.method]} fue el más rápido (${best.iterations} iteraciones).`)
    }
    for (const r of results.filter((x) => !x.converged)) {
        parts.push(`${METHOD_LABELS[r.method]} no convergió: ${r.note}.`)
    }
    const biased = ok.filter((r) => r.absoluteError !== null && r.absoluteError > 100 * tol)
    if (biased.length > 0) {
        const worst = Math.max(...biased.map((r) => r.absoluteError as number))
        parts.push(
            `Atención: en ${biased.map((r) => METHOD_LABELS[r.method]).join(', ')} el residuo |f| cumple la tolerancia pero el error en la raíz llega a ${worst.toExponential(2)}: es lo esperable con raíz múltiple o derivada pequeña (un residuo pequeño no implica un error pequeño).`,
        )
    }
    return parts.join(' ')
}

function linearProblemText(kappa: number | null): string {
    if (kappa === null) return 'No se pudo estimar κ₂(A) para la calibración.'
    if (kappa < 100) {
        return `Calibración: sistema bien condicionado (κ₂ ≈ ${kappa.toPrecision(4)}); un error relativo en las mediciones se amplifica como máximo κ₂ veces, por lo que los coeficientes son estables.`
    }
    return `Calibración: sistema mal condicionado (κ₂ ≈ ${kappa.toPrecision(4)}); errores pequeños en las mediciones pueden amplificarse hasta κ₂ veces en los coeficientes. Esto es un problema del sistema, distinto de que un método no converja.`
}

function rootsProblemText(p: Module2Params, a: DeteriorationAnalysis): string {
    if (a.analyticRoot === null) {
        return `Con estos parámetros el indicador D(t) no alcanza el umbral ${p.D_umbral} para ningún t ≥ 0.`
    }
    const parts = [
        `El indicador hipotético alcanzaría el umbral ${p.D_umbral} en t* ≈ ${a.analyticRoot.toFixed(3)} meses.`,
    ]
    const m = a.marginMonths
    if (m !== null) {
        parts.push(
            m >= 0
                ? `La inspección programada en t = ${p.t_inspeccion} ocurre ${m.toFixed(2)} meses antes de ese instante.`
                : `La inspección programada en t = ${p.t_inspeccion} ocurre ${(-m).toFixed(2)} meses DESPUÉS de superado el umbral (mantenimiento retrasado).`,
        )
    }
    const s = a.sensitivity
    if (s.amplification !== null && s.shift !== null) {
        parts.push(
            s.amplification > 10
                ? `Sensibilidad alta: bajar el umbral en ${s.delta.toExponential(1)} adelanta t* en ${s.shift.toExponential(2)} meses (amplificación ≈ ${s.amplification.toExponential(2)}); la raíz es casi múltiple y t* es poco confiable.`
                : `Sensibilidad baja: bajar el umbral en ${s.delta.toExponential(1)} mueve t* ${s.shift.toExponential(2)} meses (amplificación ≈ ${s.amplification.toFixed(3)}).`,
        )
    }
    parts.push('Son datos sintéticos: no permiten inferir el deterioro real de equipos ni sustituyen una inspección.')
    return parts.join(' ')
}

/* ----------------------------- ejecución ----------------------------- */

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

    const recLinear = (m: LinearMethodCode) => {
        const h: IterationRecord[] = []
        histories[m] = h
        return (k: number, x: Vector, residual: number) => {
            h.push({ k, x: [...x], residual, fx: null, error: absoluteError(x, xRef) })
        }
    }

    const linear: MethodResult[] = [
        toLinearResult('JACOBI', jacobi(A, b, tol, maxIter, recLinear('JACOBI')), A, b, xRef),
        toLinearResult('GAUSS_SEIDEL', gaussSeidel(A, b, tol, maxIter, recLinear('GAUSS_SEIDEL')), A, b, xRef),
        toLinearResult(
            'GRADIENTE_CONJUGADO',
            conjugateGradient(A, b, tol, maxIter, recLinear('GRADIENTE_CONJUGADO')),
            A,
            b,
            xRef,
        ),
        toLinearResult('LU', luSolve(A, b), A, b, xRef),
    ]

    const analysis = analyzeDeterioration(params)
    const ref = analysis.analyticRoot
    const f = (t: number): number => damage(params, t) - params.D_umbral
    const df = (t: number): number => params.alpha + 2 * params.beta * t

    const recRoot = (m: RootMethodCode): RootCallback => {
        const h: IterationRecord[] = []
        histories[m] = h
        return (k, x, fx) => {
            h.push({ k, x: [x], residual: Math.abs(fx), fx, error: ref === null ? null : Math.abs(x - ref) })
        }
    }

    const rootResults: RootResult[] = [
        toRootResult('BISECCION', bisection(f, params.a, params.b, tol, maxIter, recRoot('BISECCION')), ref),
        toRootResult('NEWTON_RAPHSON', newtonRaphson(f, df, params.x0, tol, maxIter, recRoot('NEWTON_RAPHSON')), ref),
        toRootResult('SECANTE', secant(f, params.s0, params.s1, tol, maxIter, recRoot('SECANTE')), ref),
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
            results: linear,
            roots: { ...analysis, results: rootResults },
            numericalConclusion: `${linearNumericalText(linear, kappa)} ${rootsNumericalText(rootResults, tol)}`.trim(),
            problemConclusion: `${rootsProblemText(params, analysis)} ${linearProblemText(kappa)}`.trim(),
        },
    }
}

/* ------------------- verificación de reproducibilidad ------------------- */

function compareRow(
    method: MethodCode,
    itStored: number,
    solStored: number[] | null,
    itFresh: number | null,
    solFresh: number[] | null,
    tol: number,
): VerificationRow {
    if (itFresh === null) {
        return { method, iterationsStored: itStored, iterationsFresh: null, maxDiff: null, ok: false }
    }
    if (solStored === null && solFresh === null) {
        return { method, iterationsStored: itStored, iterationsFresh: itFresh, maxDiff: null, ok: itStored === itFresh }
    }
    if (solStored === null || solFresh === null || solStored.length !== solFresh.length) {
        return { method, iterationsStored: itStored, iterationsFresh: itFresh, maxDiff: null, ok: false }
    }
    const maxDiff = solStored.reduce((m, v, i) => Math.max(m, Math.abs(v - (solFresh[i] as number))), 0)
    return {
        method,
        iterationsStored: itStored,
        iterationsFresh: itFresh,
        maxDiff,
        ok: maxDiff <= tol && itStored === itFresh,
    }
}

/** Compara lo guardado en la base de datos con un recálculo: prueba obligatoria del PDF. */
export function verifyRun(stored: Module2Run, fresh: Module2Run): VerificationReport {
    const tol = stored.params.tolerancia
    const rows: VerificationRow[] = []

    for (const s of stored.data.results) {
        const f = fresh.data.results.find((r) => r.method === s.method)
        rows.push(compareRow(s.method, s.iterations, s.solution, f ? f.iterations : null, f ? f.solution : null, tol))
    }
    for (const s of stored.data.roots.results) {
        const f = fresh.data.roots.results.find((r) => r.method === s.method)
        rows.push(
            compareRow(
                s.method,
                s.iterations,
                s.root === null ? null : [s.root],
                f ? f.iterations : null,
                f ? (f.root === null ? null : [f.root]) : null,
                tol,
            ),
        )
    }
    return { ok: rows.every((r) => r.ok), tolerance: tol, rows }
}