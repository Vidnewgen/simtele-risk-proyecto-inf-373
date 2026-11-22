export type Vector = number[]

const at = (a: readonly number[], i: number): number => a[i] as number

export const norm2 = (v: Vector): number =>
    Math.sqrt(v.reduce((s, a) => s + a * a, 0))

export const absoluteError = (x: Vector, xRef: Vector): number =>
    norm2(x.map((a, i) => a - at(xRef, i)))

/** Error relativo; devuelve null si la referencia es el vector cero (evita dividir por 0). */
export const relativeError = (x: Vector, xRef: Vector): number | null => {
    const d = norm2(xRef)
    return d === 0 ? null : absoluteError(x, xRef) / d
}

export const percentageError = (rel: number | null): number | null =>
    rel === null ? null : rel * 100