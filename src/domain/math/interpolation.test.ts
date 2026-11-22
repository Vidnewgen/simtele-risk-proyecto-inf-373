import { describe, expect, it } from 'vitest'
import {
  lagrangeInterpolation,
  naturalCubicSpline,
  newtonDividedDifferences,
} from './interpolation'

describe('interpolación', () => {
  const nodes = [0, 1, 2, 3]
  const values = [0, 1, 4, 9]

  it('Lagrange reproduce puntos y el polinomio conocido', () => {
    expect(lagrangeInterpolation(nodes, values, 1.5)).toBeCloseTo(2.25, 10)
  })

  it('Newton por diferencias divididas reproduce el polinomio', () => {
    const newton = newtonDividedDifferences(nodes, values)
    expect(newton.coefficients).toEqual([0, 1, 1, 0])
    expect(newton.evaluate(1.5)).toBeCloseTo(2.25, 10)
  })

  it('Spline cúbico pasa por todos los nodos', () => {
    const spline = naturalCubicSpline(nodes, values)
    nodes.forEach((node, index) => {
      expect(spline.evaluate(node)).toBeCloseTo(values[index], 10)
    })
    expect(spline.evaluate(1.5)).toBeCloseTo(2.25, 0)
  })

  it('rechaza nodos duplicados o insuficientes', () => {
    expect(() => lagrangeInterpolation([1, 1], [2, 3], 1)).toThrow()
    expect(() => naturalCubicSpline([1], [2])).toThrow()
  })

  it('interpola sin(t) con errores reales en puntos ocultos', () => {
    const sineNodes = [0, 0.5, 1, 1.5, 2]
    const sineValues = sineNodes.map(Math.sin)
    const testPoints = [0.25, 0.75, 1.25, 1.75]
    for (const point of testPoints) {
      const lagrange = lagrangeInterpolation(sineNodes, sineValues, point)
      const newton = newtonDividedDifferences(sineNodes, sineValues).evaluate(point)
      const spline = naturalCubicSpline(sineNodes, sineValues).evaluate(point)
      expect(Math.abs(lagrange - Math.sin(point))).toBeLessThan(0.003)
      expect(Math.abs(newton - Math.sin(point))).toBeLessThan(0.003)
      expect(Math.abs(spline - Math.sin(point))).toBeLessThan(0.02)
    }
  })
})
