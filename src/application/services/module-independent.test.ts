import { describe, expect, it } from 'vitest'
import { Module1Engine } from './module1.engine'
import { Module3Engine } from './module3.engine'
import { Module4Engine } from './module4.engine'

describe('motores independientes de módulos', () => {
  it('Module1 valida parámetros y calcula detención', () => {
    const engine = new Module1Engine()
    expect(engine.validate({ v0: 20, acceleration: 2 })).toEqual([])
    expect(engine.validate({ v0: 0, acceleration: -1 }).length).toBeGreaterThan(0)
    const result = engine.calculate(
      { name: 'NORMAL', description: 'normal', equation: 'v(t)' },
      { v0: 20, acceleration: 2 },
    )
    expect(result.stoppingTime).toBeCloseTo(10, 6)
  })

  it('Module3 valida parámetros y calcula viento', () => {
    const engine = new Module3Engine()
    const params = { mass: 1, damping: 1.2, stiffness: 4, amplitude: 1, duration: 20, step: 0.01 }
    expect(engine.validate(params)).toEqual([])
    const result = engine.calculate(
      { name: 'NORMAL', description: 'normal', equation: 'viento' },
      params,
    )
    expect(result.points.length).toBeGreaterThan(100)
  })

  it('Module4 valida parámetros y calcula interpolaciones', () => {
    const engine = new Module4Engine()
    const params = { step: 0.25, nodeCount: 9, noiseAmplitude: 0 }
    expect(engine.validate(params)).toEqual([])
    const result = engine.calculate(
      { name: 'NORMAL', description: 'normal', equation: 'sin(t)' },
      params,
    )
    expect(result.recovered).toHaveLength(3)
  })
})
