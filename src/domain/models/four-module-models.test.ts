import { describe, expect, it } from 'vitest'
import { module1Detention, module2Deterioration, module3Wind, module4Sensors } from './four-module-models'

const normal = { name: 'NORMAL' as const, description: 'Caso reproducible', equation: 'x\' = v; v\' = -a' }

describe('modelos de los cuatro casos', () => {
  it('determina el umbral cuadrático del deterioro y selecciona una raíz válida', () => {
    for (const scenario of [
      normal,
      { name: 'ESTRES' as const, description: 'Estrés', equation: 'D(t)' },
      { name: 'MAL_CONDICIONADO' as const, description: 'Mal condicionado', equation: 'D(t)' },
    ]) {
      const result = module2Deterioration(scenario)
      expect(result.converged).toBe(true)
      expect(result.thresholdTime).toBeGreaterThan(0)
      expect(result.thresholdError).toBeLessThan(1e-6)
    }
  })

  it('calcula detención con referencia analítica', () => {
    for (const scenario of [
      normal,
      { name: 'ESTRES' as const, description: 'Estrés', equation: 'v(t)' },
      { name: 'MAL_CONDICIONADO' as const, description: 'Mal condicionado', equation: 'v(t)' },
    ]) {
      const result = module1Detention(scenario)
      expect(result.stoppingTime).toBeCloseTo(result.parameters.v0 / result.parameters.acceleration, 6)
      expect(result.distanceError).toBeLessThan(0.02)
      expect(result.trapezoidalDistance).toBeCloseTo(result.referenceDistance, 2)
      expect(result.simpsonDistance).toBeCloseTo(result.referenceDistance, 8)
      expect(result.rombergConverged).toBe(true)
      expect(result.rombergDistance).toBeCloseTo(result.referenceDistance, 8)
    }
  })

  it('integra el modelo de viento con RK4', () => {
    for (const scenario of [
      normal,
      { name: 'ESTRES' as const, description: 'Estrés', equation: 'viento' },
      { name: 'MAL_CONDICIONADO' as const, description: 'Mal condicionado', equation: 'viento' },
    ]) {
      const result = module3Wind(scenario)
      expect(result.points.length).toBeGreaterThan(100)
      expect(result.maximumDisplacement).toBeGreaterThan(0)
      expect(result.freeReferencePoints.length).toBeGreaterThan(100)
    }
  })

  it('reconstruye sensores con Lagrange y mide el error real', () => {
    const results = [
      normal,
      { name: 'ESTRES' as const, description: 'Estrés', equation: 'sin(t)' },
      { name: 'MAL_CONDICIONADO' as const, description: 'Mal condicionado', equation: 'sin(t)' },
    ].map(scenario => module4Sensors(scenario))

    results.forEach((result) => {
      expect(result.recovered).toHaveLength(3)
      expect(Number.isFinite(result.meanAbsoluteError)).toBe(true)
      expect(Number.isFinite(result.newtonError)).toBe(true)
      expect(Number.isFinite(result.splineError)).toBe(true)
    })

    expect(results[0].meanAbsoluteError).toBeLessThan(0.1)
    expect(results[2].meanAbsoluteError).toBeGreaterThan(results[0].meanAbsoluteError)
  })
})
