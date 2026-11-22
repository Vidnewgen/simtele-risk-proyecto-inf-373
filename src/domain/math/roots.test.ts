import { describe, expect, it } from 'vitest'
import { bisection, firstNonNegativeRoot, newtonRaphson, secant } from './roots'

describe('métodos de raíces', () => {
  const f = (x: number) => x * x - 2
  const df = (x: number) => 2 * x

  it('bisección converge a sqrt(2)', () => {
    const result = bisection(f, 1, 2, 1e-10, 100)
    expect(result.converged).toBe(true)
    expect(result.root).toBeCloseTo(Math.sqrt(2), 9)
  })

  it('Newton-Raphson converge a sqrt(2)', () => {
    const result = newtonRaphson(f, df, 1.5, 1e-10, 100)
    expect(result.converged).toBe(true)
    expect(result.root).toBeCloseTo(Math.sqrt(2), 9)
  })

  it('Secante converge a sqrt(2)', () => {
    const result = secant(f, 1, 2, 1e-10, 100)
    expect(result.converged).toBe(true)
    expect(result.root).toBeCloseTo(Math.sqrt(2), 9)
  })

  it('rechaza derivada nula y evalúa la raíz cuadrática físicamente válida', () => {
    const newton = newtonRaphson(f, () => 0, 1.5, 1e-10, 100)
    expect(newton.converged).toBe(false)

    const root = firstNonNegativeRoot(64 - 100, 1.2, -0.01)
    expect(root.root).not.toBeNull()
    expect(root.root).toBeGreaterThanOrEqual(0)
  })
})
