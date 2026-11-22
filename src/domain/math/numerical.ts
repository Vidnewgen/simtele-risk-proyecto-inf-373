export type IterationResult = {
  iteration: number
  approximation: number[]
  residual: number
  absoluteError: number
  relativeError: number
  percentageError: number
}

export type ConvergenceResult = {
  converged: boolean
  iterations: number
  solution: number[]
  residualNorm: number
  absoluteError: number
  relativeError: number
  percentageError: number
  history: IterationResult[]
}

export function norm(values: number[]): number {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0))
}

export function residualNorm(a: number[][], x: number[], b: number[]): number {
  const residual = b.map((value, row) =>
    value - a[row].reduce((sum, coefficient, column) => sum + coefficient * x[column], 0),
  )
  return norm(residual)
}

export function errorMetrics(reference: number[], approximation: number[]): {
  absoluteError: number
  relativeError: number
  percentageError: number
} {
  const absoluteError = norm(reference.map((value, index) => approximation[index] - value))
  const referenceNorm = norm(reference)
  const relativeError = referenceNorm === 0 ? 0 : absoluteError / referenceNorm
  return { absoluteError, relativeError, percentageError: relativeError * 100 }
}

export function absoluteError(reference: number, approximation: number): number {
  return Math.abs(approximation - reference)
}

export function relativeError(reference: number, approximation: number): number {
  const absolute = absoluteError(reference, approximation)
  return reference === 0 ? 0 : absolute / Math.abs(reference)
}

export function percentageError(reference: number, approximation: number): number {
  return relativeError(reference, approximation) * 100
}

export function sensitivityEstimate(
  referenceInput: number,
  perturbedInput: number,
  referenceOutput: number,
  perturbedOutput: number,
): number {
  const inputChange = Math.abs(perturbedInput - referenceInput)
  if (referenceInput === 0 || inputChange === 0) return 0
  const relativeInputChange = inputChange / Math.abs(referenceInput)
  const relativeOutputChange = relativeError(referenceOutput, perturbedOutput)
  return relativeOutputChange / relativeInputChange
}

export function jacobi(
  a: number[][],
  b: number[],
  tolerance = 1e-6,
  maxIterations = 1000,
): ConvergenceResult {
  let x = b.map(() => 0)
  const history: IterationResult[] = []

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const next = b.map((value, row) => {
      const offDiagonal = a[row].reduce((sum, coefficient, column) =>
        column === row ? sum : sum + coefficient * x[column], 0)
      return (value - offDiagonal) / a[row][row]
    })

    const residual = residualNorm(a, next, b)
    const metrics = errorMetrics(b.map((_, index) => x[index]), next)
    history.push({ iteration, approximation: next, residual, ...metrics })
    x = next
    if (residual <= tolerance) {
      const finalMetrics = errorMetrics(b.map((_, index) => 0), next)
      return {
        converged: true,
        iterations: iteration,
        solution: x,
        residualNorm: residual,
        absoluteError: finalMetrics.absoluteError,
        relativeError: finalMetrics.relativeError,
        percentageError: finalMetrics.percentageError,
        history,
      }
    }
  }

  const residual = residualNorm(a, x, b)
  const metrics = errorMetrics(b.map(() => 0), x)
  return { converged: false, iterations: maxIterations, solution: x, residualNorm: residual, ...metrics, history }
}

export function gaussSeidel(
  a: number[][],
  b: number[],
  tolerance = 1e-6,
  maxIterations = 1000,
): ConvergenceResult {
  let x = b.map(() => 0)
  const history: IterationResult[] = []

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    for (let row = 0; row < b.length; row++) {
      let sum = b[row]
      for (let column = 0; column < b.length; column++) {
        if (column !== row) sum -= a[row][column] * x[column]
      }
      x[row] = sum / a[row][row]
    }

    const residual = residualNorm(a, x, b)
    const previous = history.at(-1)?.approximation ?? b.map(() => 0)
    const metrics = errorMetrics(previous, x)
    history.push({ iteration, approximation: [...x], residual, ...metrics })
    if (residual <= tolerance) {
      return { converged: true, iterations: iteration, solution: x, residualNorm: residual, ...metrics, history }
    }
  }

  const residual = residualNorm(a, x, b)
  const metrics = errorMetrics(history.at(-1)?.approximation ?? b.map(() => 0), x)
  return { converged: false, iterations: maxIterations, solution: x, residualNorm: residual, ...metrics, history }
}

export function luSolve(a: number[][], b: number[]): ConvergenceResult {
  const n = b.length
  const lower = Array.from({ length: n }, () => Array(n).fill(0))
  const upper = a.map(row => [...row])

  for (let i = 0; i < n; i++) {
    lower[i][i] = 1
    for (let row = i + 1; row < n; row++) {
      const factor = upper[row][i] / upper[i][i]
      lower[row][i] = factor
      for (let column = i; column < n; column++) upper[row][column] -= factor * upper[i][column]
    }
  }

  const y = Array(n).fill(0)
  for (let row = 0; row < n; row++) {
    y[row] = b[row] - lower[row].reduce((sum, value, column) => sum + value * y[column], 0)
  }
  const x = Array(n).fill(0)
  for (let row = n - 1; row >= 0; row--) {
    let sum = y[row]
    for (let column = row + 1; column < n; column++) sum -= upper[row][column] * x[column]
    x[row] = sum / upper[row][row]
  }

  const residual = residualNorm(a, x, b)
  const reference = b.map(() => 0)
  const metrics = errorMetrics(reference, x)
  const history = [{ iteration: 1, approximation: x, residual, ...metrics }]
  return { converged: residual <= 1e-6, iterations: 1, solution: x, residualNorm: residual, ...metrics, history }
}

export function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, index) => sum + value * b[index], 0)
}

export function conjugateGradient(
  a: number[][],
  b: number[],
  tolerance = 1e-10,
  maxIterations = 1000,
): ConvergenceResult {
  let x = b.map(() => 0)
  const history: IterationResult[] = []
  let residual = b.map((value, row) => value - a[row].reduce((sum, coefficient, column) => sum + coefficient * x[column], 0))
  let direction = [...residual]

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const residualNormValue = dot(residual, residual)
    if (Math.sqrt(residualNormValue) <= tolerance) break

    const ap = a.map(row => dot(row, direction))
    const alpha = residualNormValue / dot(direction, ap)
    x = x.map((value, index) => value + alpha * direction[index])
    const nextResidual = residual.map((value, index) => value - alpha * ap[index])
    const residualNormCurrent = residualNorm(a, x, b)
    const metrics = errorMetrics(b.map(() => 0), x)
    history.push({ iteration, approximation: [...x], residual: residualNormCurrent, ...metrics })

    if (Math.sqrt(dot(nextResidual, nextResidual)) <= tolerance) {
      return { converged: true, iterations: iteration, solution: x, residualNorm: residualNormCurrent, ...metrics, history }
    }

    const beta = dot(nextResidual, nextResidual) / residualNormValue
    direction = nextResidual.map((value, index) => value + beta * direction[index])
    residual = nextResidual
  }

  const residualCurrent = residualNorm(a, x, b)
  const metrics = errorMetrics(b.map(() => 0), x)
  return { converged: residualCurrent <= tolerance, iterations: history.length, solution: x, residualNorm: residualCurrent, ...metrics, history }
}

export function conditionEstimate(a: number[][]): number {
  const n = a.length
  const inverse = a.map((_, column) => {
    const identity = Array(n).fill(0)
    identity[column] = 1
    const result = luSolve(a, identity)
    return result.solution
  })
  const matrixNorm = Math.max(...a.map(row => row.reduce((sum, value) => sum + Math.abs(value), 0)))
  const inverseNorm = Math.max(...Array.from({ length: n }, (_, row) =>
    inverse.reduce((sum, columnVector) => sum + Math.abs(columnVector[row]), 0)))
  return matrixNorm * inverseNorm
}

export function bisection(
  fn: (value: number) => number,
  lower: number,
  upper: number,
  tolerance = 1e-8,
  maxIterations = 100,
): { root: number; iterations: number; converged: boolean } {
  let a = lower
  let b = upper
  let mid = a
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    mid = (a + b) / 2
    const value = fn(mid)
    if (Math.abs(value) <= tolerance || Math.abs(b - a) <= tolerance) {
      return { root: mid, iterations: iteration, converged: true }
    }
    if (fn(a) * value <= 0) b = mid
    else a = mid
  }
  return { root: mid, iterations: maxIterations, converged: false }
}

export function trapezoidal(f: (x: number) => number, lower: number, upper: number, intervals: number): number {
  const h = (upper - lower) / intervals
  let sum = (f(lower) + f(upper)) / 2
  for (let index = 1; index < intervals; index++) sum += f(lower + index * h)
  return h * sum
}

export function simpson13(f: (x: number) => number, lower: number, upper: number, intervals: number): number {
  const n = intervals % 2 === 0 ? intervals : intervals + 1
  const h = (upper - lower) / n
  let sum = f(lower) + f(upper)
  for (let index = 1; index < n; index++) {
    sum += (index % 2 === 0 ? 2 : 4) * f(lower + index * h)
  }
  return h * sum / 3
}

export interface RombergResult {
  value: number
  table: number[][]
  iterations: number
  converged: boolean
  absoluteError: number | null
}

export function romberg(
  f: (x: number) => number,
  lower: number,
  upper: number,
  levels = 8,
  tolerance = 1e-10,
): RombergResult {
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || !Number.isFinite(tolerance)) {
    return { value: Number.NaN, table: [], iterations: 0, converged: false, absoluteError: null }
  }
  if (lower === upper) {
    return { value: 0, table: [[0]], iterations: 1, converged: true, absoluteError: 0 }
  }
  if (!Number.isInteger(levels) || levels < 1) {
    return { value: Number.NaN, table: [], iterations: 0, converged: false, absoluteError: null }
  }

  const table: number[][] = Array.from({ length: levels }, () => Array(levels).fill(0))
  table[0][0] = (upper - lower) * (f(lower) + f(upper)) / 2

  let converged = false
  let iterations = 1
  for (let row = 1; row < levels; row++) {
    iterations = row + 1
    const intervals = 2 ** row
    const h = (upper - lower) / intervals
    let oddPointSum = 0
    for (let point = 1; point < intervals; point += 2) {
      oddPointSum += f(lower + point * h)
    }
    table[row][0] = table[row - 1][0] / 2 + h * oddPointSum

    for (let column = 1; column <= row; column++) {
      const factor = 4 ** column
      table[row][column] =
        table[row][column - 1]
        + (table[row][column - 1] - table[row - 1][column - 1]) / (factor - 1)
    }

    if (Math.abs(table[row][row] - table[row - 1][row - 1]) <= tolerance) {
      converged = true
      break
    }
  }

  const valueRow = iterations - 1
  const value = table[valueRow][valueRow]
  return { value, table: table.slice(0, iterations), iterations, converged, absoluteError: null }
}

export function rk2(
  derivative: (t: number, state: number[]) => number[],
  initial: number[],
  start: number,
  end: number,
  step: number,
): number[][] {
  const points: number[][] = [[start, ...initial]]
  let t = start
  let state = [...initial]
  while (t < end - step * 1e-10) {
    const h = Math.min(step, end - t)
    const k1 = derivative(t, state)
    const midpoint = state.map((value, index) => value + h * k1[index] / 2)
    const k2 = derivative(t + h / 2, midpoint)
    state = state.map((value, index) => value + h * k2[index])
    t += h
    points.push([t, ...state])
  }
  return points
}

export function rk4(
  derivative: (t: number, state: number[]) => number[],
  initial: number[],
  start: number,
  end: number,
  step: number,
): number[][] {
  const points: number[][] = [[start, ...initial]]
  let t = start
  let state = [...initial]
  while (t < end - step * 1e-10) {
    const h = Math.min(step, end - t)
    const k1 = derivative(t, state)
    const k2 = derivative(t + h / 2, state.map((value, index) => value + h * k1[index] / 2))
    const k3 = derivative(t + h / 2, state.map((value, index) => value + h * k2[index] / 2))
    const k4 = derivative(t + h, state.map((value, index) => value + h * k3[index]))
    state = state.map((value, index) => value + h * (k1[index] + 2 * k2[index] + 2 * k3[index] + k4[index]) / 6)
    t += h
    points.push([t, ...state])
  }
  return points
}
