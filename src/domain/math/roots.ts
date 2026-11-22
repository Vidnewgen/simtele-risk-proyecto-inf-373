export type Fn = (t: number) => number
export type RootCallback = (k: number, x: number, fx: number) => void

export interface RootSolve {
    root: number | null
    fRoot: number | null
    converged: boolean
    iterations: number
    note: string
    timeMs: number
}

const fail = (
    t0: number,
    iterations: number,
    note: string,
    root: number | null = null,
    fRoot: number | null = null,
): RootSolve => ({
    root,
    fRoot,
    converged: false,
    iterations,
    note,
    timeMs: performance.now() - t0,
})

const success = (t0: number, iterations: number, root: number, fRoot: number): RootSolve => ({
    root,
    fRoot,
    converged: true,
    iterations,
    note: 'Convergió',
    timeMs: performance.now() - t0,
})

/** D(t) = D0 + α·t + β·t² */
export const damage = (p: { D0: number; alpha: number; beta: number }, t: number): number =>
    p.D0 + p.alpha * t + p.beta * t * t

/** Bisección. Criterio de parada: |f(c)| ≤ tol. Exige cambio de signo en [a, b]. */
export function bisection(
    f: Fn,
    a: number,
    b: number,
    tol: number,
    maxIter: number,
    onIter?: RootCallback,
): RootSolve {
    const t0 = performance.now()
    let lo = a
    let hi = b
    let flo = f(lo)
    const fhi = f(hi)
    if (!Number.isFinite(flo) || !Number.isFinite(fhi)) {
        return fail(t0, 0, 'f no es finita en los extremos del intervalo')
    }
    if (Math.abs(flo) <= tol) return success(t0, 0, lo, flo)
    if (Math.abs(fhi) <= tol) return success(t0, 0, hi, fhi)
    if (flo * fhi > 0) {
        return fail(
            t0,
            0,
            'f(a) y f(b) tienen el mismo signo: sin cambio de signo no se puede garantizar una raíz en el intervalo',
        )
    }

    let mid = lo
    let fmid = flo
    for (let k = 1; k <= maxIter; k++) {
        mid = (lo + hi) / 2
        fmid = f(mid)
        if (!Number.isFinite(fmid)) return fail(t0, k, 'f no es finita en el punto medio')
        onIter?.(k, mid, fmid)
        if (Math.abs(fmid) <= tol) return success(t0, k, mid, fmid)
        if (flo * fmid < 0) {
            hi = mid
        } else {
            lo = mid
            flo = fmid
        }
        if (hi - lo <= Number.EPSILON * Math.max(1, Math.abs(mid))) {
            return fail(t0, k, 'El intervalo ya no se puede reducir en doble precisión', mid, fmid)
        }
    }
    return fail(t0, maxIter, 'Se alcanzó el máximo de iteraciones', mid, fmid)
}

/** Newton-Raphson. Criterio de parada: |f(x_k)| ≤ tol. */
export function newtonRaphson(
    f: Fn,
    df: Fn,
    x0: number,
    tol: number,
    maxIter: number,
    onIter?: RootCallback,
): RootSolve {
    const t0 = performance.now()
    let x = x0
    let fx = f(x)
    if (!Number.isFinite(fx)) return fail(t0, 0, 'f no es finita en la semilla')
    if (Math.abs(fx) <= tol) return success(t0, 0, x, fx)

    for (let k = 1; k <= maxIter; k++) {
        const d = df(x)
        if (!Number.isFinite(d) || Math.abs(d) < 1e-14) {
            return fail(t0, k - 1, `Derivada ≈ 0 en x = ${x}: Newton no puede continuar`, x, fx)
        }
        const xn = x - fx / d
        const fn = f(xn)
        if (!Number.isFinite(xn) || !Number.isFinite(fn)) {
            return fail(t0, k, 'Newton divergió (valor no finito)')
        }
        onIter?.(k, xn, fn)
        x = xn
        fx = fn
        if (Math.abs(fx) <= tol) return success(t0, k, x, fx)
    }
    return fail(t0, maxIter, 'Se alcanzó el máximo de iteraciones', x, fx)
}

/** Secante con dos semillas. Criterio de parada: |f(x_k)| ≤ tol. */
export function secant(
    f: Fn,
    s0: number,
    s1: number,
    tol: number,
    maxIter: number,
    onIter?: RootCallback,
): RootSolve {
    const t0 = performance.now()
    let xa = s0
    let xb = s1
    let fa = f(xa)
    let fb = f(xb)
    if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
        return fail(t0, 0, 'f no es finita en las semillas')
    }
    if (Math.abs(fb) <= tol) return success(t0, 0, xb, fb)

    for (let k = 1; k <= maxIter; k++) {
        if (fb === fa) {
            return fail(t0, k - 1, 'Pendiente nula: f(x_{k-1}) = f(x_k), la secante no está definida', xb, fb)
        }
        const xc = xb - (fb * (xb - xa)) / (fb - fa)
        const fc = f(xc)
        if (!Number.isFinite(xc) || !Number.isFinite(fc)) {
            return fail(t0, k, 'La secante divergió (valor no finito)')
        }
        onIter?.(k, xc, fc)
        if (Math.abs(fc) <= tol) return success(t0, k, xc, fc)
        xa = xb
        fa = fb
        xb = xc
        fb = fc
    }
    return fail(t0, maxIter, 'Se alcanzó el máximo de iteraciones', xb, fb)
}

export interface QuadraticRoot {
    root: number | null
    discriminant: number
}

/**
 * Menor raíz real no negativa de c2·t² + c1·t + c0 = 0 (referencia analítica).
 * Usa la forma numéricamente estable (evita cancelación).
 */
export function firstNonNegativeRoot(c0: number, c1: number, c2: number): QuadraticRoot {
    const EPS = 1e-15
    if (Math.abs(c2) < EPS) {
        if (Math.abs(c1) < EPS) return { root: null, discriminant: 0 }
        const t = -c0 / c1
        return { root: t >= 0 ? t : null, discriminant: c1 * c1 }
    }
    let disc = c1 * c1 - 4 * c2 * c0
    const scale = Math.max(c1 * c1, 1)
    if (disc < -1e-12 * scale) return { root: null, discriminant: disc }
    if (Math.abs(disc) <= 1e-12 * scale) disc = 0

    const sq = Math.sqrt(disc)
    const q = -0.5 * (c1 + (c1 >= 0 ? sq : -sq))
    const candidates: number[] = q !== 0 ? [q / c2, c0 / q] : [0]
    const valid = candidates.filter((r) => Number.isFinite(r) && r >= -1e-12).map((r) => Math.max(r, 0))
    return { root: valid.length > 0 ? Math.min(...valid) : null, discriminant: disc }
}