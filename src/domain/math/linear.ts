import { norm2, type Vector } from './errors'

export type Matrix = number[][]

export interface SolveResult {
    x: Vector | null // null = divergió o no aplica
    converged: boolean
    iterations: number
    timeMs: number
}

const at = (a: readonly number[], i: number): number => a[i] as number
const rowOf = (A: Matrix, i: number): number[] => A[i] as number[]
const dot = (a: Vector, b: Vector): number => a.reduce((s, v, i) => s + v * at(b, i), 0)

export const matVec = (A: Matrix, x: Vector): Vector =>
    A.map((row) => row.reduce((s, a, j) => s + a * at(x, j), 0))

export const residualNorm = (A: Matrix, b: Vector, x: Vector): number => {
    const Ax = matVec(A, x)
    return norm2(b.map((bi, i) => bi - at(Ax, i)))
}

export const isSymmetric = (A: Matrix, eps = 1e-12): boolean =>
    A.every((row, i) => row.every((a, j) => Math.abs(a - at(rowOf(A, j), i)) <= eps))

export function jacobi(A: Matrix, b: Vector, tol: number, maxIter: number): SolveResult {
    const t0 = performance.now()
    const n = b.length
    let x: Vector = new Array(n).fill(0)
    for (let k = 1; k <= maxIter; k++) {
        const xn: Vector = new Array(n).fill(0)
        for (let i = 0; i < n; i++) {
            const Ai = rowOf(A, i)
            let s = 0
            for (let j = 0; j < n; j++) if (j !== i) s += at(Ai, j) * at(x, j)
            xn[i] = (at(b, i) - s) / at(Ai, i)
        }
        x = xn
        const r = residualNorm(A, b, x)
        if (!Number.isFinite(r) || !x.every(Number.isFinite)) {
            return { x: null, converged: false, iterations: k, timeMs: performance.now() - t0 }
        }
        if (r < tol) return { x, converged: true, iterations: k, timeMs: performance.now() - t0 }
    }
    return { x, converged: false, iterations: maxIter, timeMs: performance.now() - t0 }
}

export function gaussSeidel(A: Matrix, b: Vector, tol: number, maxIter: number): SolveResult {
    const t0 = performance.now()
    const n = b.length
    const x: Vector = new Array(n).fill(0)
    for (let k = 1; k <= maxIter; k++) {
        for (let i = 0; i < n; i++) {
            const Ai = rowOf(A, i)
            let s = 0
            for (let j = 0; j < n; j++) if (j !== i) s += at(Ai, j) * at(x, j)
            x[i] = (at(b, i) - s) / at(Ai, i)
        }
        const r = residualNorm(A, b, x)
        if (!Number.isFinite(r) || !x.every(Number.isFinite)) {
            return { x: null, converged: false, iterations: k, timeMs: performance.now() - t0 }
        }
        if (r < tol) return { x: [...x], converged: true, iterations: k, timeMs: performance.now() - t0 }
    }
    return { x: [...x], converged: false, iterations: maxIter, timeMs: performance.now() - t0 }
}

/** LU de Doolittle sin pivoteo (válido para matrices SPD). */
export function luSolve(A: Matrix, b: Vector): SolveResult {
    const t0 = performance.now()
    const n = b.length
    const L: Matrix = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    )
    const U: Matrix = Array.from({ length: n }, () => new Array(n).fill(0))

    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            let s = 0
            for (let k = 0; k < i; k++) s += at(rowOf(L, i), k) * at(rowOf(U, k), j)
            rowOf(U, i)[j] = at(rowOf(A, i), j) - s
        }
        const piv = at(rowOf(U, i), i)
        if (Math.abs(piv) < 1e-300) {
            return { x: null, converged: false, iterations: 1, timeMs: performance.now() - t0 }
        }
        for (let j = i + 1; j < n; j++) {
            let s = 0
            for (let k = 0; k < i; k++) s += at(rowOf(L, j), k) * at(rowOf(U, k), i)
            rowOf(L, j)[i] = (at(rowOf(A, j), i) - s) / piv
        }
    }

    const y: Vector = new Array(n).fill(0)
    for (let i = 0; i < n; i++) {
        let s = 0
        for (let k = 0; k < i; k++) s += at(rowOf(L, i), k) * at(y, k)
        y[i] = at(b, i) - s
    }
    const x: Vector = new Array(n).fill(0)
    for (let i = n - 1; i >= 0; i--) {
        let s = 0
        for (let k = i + 1; k < n; k++) s += at(rowOf(U, i), k) * at(x, k)
        x[i] = (at(y, i) - s) / at(rowOf(U, i), i)
    }
    return { x, converged: true, iterations: 1, timeMs: performance.now() - t0 }
}

/** Gradiente conjugado estándar: exige A simétrica definida positiva. */
export function conjugateGradient(A: Matrix, b: Vector, tol: number, maxIter: number): SolveResult {
    const t0 = performance.now()
    if (!isSymmetric(A)) {
        return { x: null, converged: false, iterations: 0, timeMs: performance.now() - t0 }
    }
    const n = b.length
    let x: Vector = new Array(n).fill(0)
    let r: Vector = [...b]
    let p: Vector = [...r]
    let rs = dot(r, r)
    if (Math.sqrt(rs) < tol) return { x, converged: true, iterations: 0, timeMs: performance.now() - t0 }

    for (let k = 1; k <= maxIter; k++) {
        const Ap = matVec(A, p)
        const pAp = dot(p, Ap)
        if (!(pAp > 0)) {
            return { x, converged: false, iterations: k, timeMs: performance.now() - t0 } // no es SPD
        }
        const alpha = rs / pAp
        x = x.map((xi, i) => xi + alpha * at(p, i))
        r = r.map((ri, i) => ri - alpha * at(Ap, i))
        const rsNew = dot(r, r)
        if (Math.sqrt(rsNew) < tol) {
            return { x, converged: true, iterations: k, timeMs: performance.now() - t0 }
        }
        const beta = rsNew / rs
        p = r.map((ri, i) => ri + beta * at(p, i))
        rs = rsNew
    }
    return { x, converged: false, iterations: maxIter, timeMs: performance.now() - t0 }
}

/**
 * κ₂(A) = λmax/λmin para A SPD.
 * λmax: iteración de la potencia. λmin: iteración inversa (usa LU).
 */
export function conditionNumberSPD(A: Matrix): number | null {
    const n = A.length
    const start = (): Vector => Array.from({ length: n }, (_, i) => Math.cos(1.7 * i + 0.3) + 0.1 * i)
    const normalize = (v: Vector): Vector => {
        const m = norm2(v)
        return v.map((a) => a / m)
    }

    let v = normalize(start())
    let lmax = 0
    for (let it = 0; it < 5000; it++) {
        v = normalize(matVec(A, v))
        const l = dot(v, matVec(A, v))
        if (Math.abs(l - lmax) <= 1e-14 * Math.abs(l)) { lmax = l; break }
        lmax = l
    }

    let u = normalize(start())
    let lmin = 0
    for (let it = 0; it < 5000; it++) {
        const w = luSolve(A, u).x
        if (!w) return null
        u = normalize(w)
        const l = dot(u, matVec(A, u))
        if (Math.abs(l - lmin) <= 1e-14 * Math.abs(l)) { lmin = l; break }
        lmin = l
    }
    return lmin > 0 ? lmax / lmin : null
}