import { describe, expect, it } from 'vitest'
import {
  bisection,
  conjugateGradient,
  gaussSeidel,
  jacobi,
  luSolve,
  percentageError,
  relativeError,
  residualNorm,
  rk2,
  rk4,
  sensitivityEstimate,
  simpson13,
  trapezoidal,
} from './numerical'

const a = [[4, 1, 0, 0], [1, 4, 1, 0], [0, 1, 4, 1], [0, 0, 1, 4]]
const b = [6, 11, 11, 6]
const exact = [1, 2, 2, 1]

describe('errores y sensibilidad', () => {
  it('calcula errores sin dividir por cero', () => {
    expect(relativeError(0, 0)).toBe(0)
    expect(relativeError(10, 11)).toBeCloseTo(0.1, 12)
    expect(percentageError(10, 11)).toBeCloseTo(10, 12)
  })

  it('cuantifica sensibilidad ante una entrada perturbada', () => {
    expect(sensitivityEstimate(10, 10.5, 30, 31.5)).toBeCloseTo(1, 12)
  })
})

describe('sistemas lineales', () => {
  it('resuelve con Jacobi dentro de tolerancia', () => {
    const result = jacobi(a, b, 1e-8, 100)
    expect(result.converged).toBe(true)
    expect(residualNorm(a, result.solution, b)).toBeLessThan(1e-6)
  })

  it('resuelve con Gauss-Seidel dentro de tolerancia', () => {
    const result = gaussSeidel(a, b, 1e-8, 100)
    expect(result.converged).toBe(true)
    expect(result.solution).toEqual(expect.any(Array))
  })

  it('resuelve con LU y gradiente conjugado', () => {
    const lu = luSolve(a, b)
    const cg = conjugateGradient(a, b, 1e-10, 100)
    for (const result of [lu, cg]) {
      expect(result.converged).toBe(true)
      result.solution.forEach((value, index) => expect(value).toBeCloseTo(exact[index], 8))
    }
  })
})

describe('raíces e integración', () => {
  it('encuentra una raíz por bisección', () => {
    const result = bisection(value => value * value - 2, 1, 2, 1e-10)
    expect(result.converged).toBe(true)
    expect(result.root).toBeCloseTo(Math.sqrt(2), 8)
  })

  it('integra x² con trapecio y Simpson', () => {
    expect(trapezoidal(value => value * value, 0, 1, 1000)).toBeCloseTo(1 / 3, 5)
    expect(simpson13(value => value * value, 0, 1, 100)).toBeCloseTo(1 / 3, 8)
  })
})

describe('ecuaciones diferenciales', () => {
  it('aproxima una EDO con RK2 punto medio', () => {
    const solution = rk2(
      (_t, state) => [state[1], -1],
      [0, 20],
      0,
      1,
      0.001,
    )
    expect(solution.at(-1)?.[2]).toBeCloseTo(19, 6)
  })

  it('aproxima la posición con RK4', () => {
    const solution = rk4(
      (_t, state) => [state[1], -1],
      [0, 20],
      0,
      1,
      0.001,
    )
    expect(solution.at(-1)?.[2]).toBeCloseTo(19, 6)
    expect(solution.at(-1)?.[1]).toBeCloseTo(19.5, 4)
  })
})
