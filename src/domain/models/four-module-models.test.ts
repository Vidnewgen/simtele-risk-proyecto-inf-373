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
    const result = module1Detention(normal)
    expect(result.stoppingTime).toBeCloseTo(10, 6)
    expect(result.distanceError).toBeLessThan(0.02)
  })

  it('integra el modelo de viento con RK4', () => {
    const result = module3Wind(normal)
    expect(result.points.length).toBeGreaterThan(100)
    expect(result.maximumDisplacement).toBeGreaterThan(0)
  })

  it('reconstruye sensores con Lagrange y mide el error real', () => {
    const result = module4Sensors(normal)
    expect(result.recovered).toHaveLength(3)
    expect(result.meanAbsoluteError).toBeLessThan(0.1)
  })
})
