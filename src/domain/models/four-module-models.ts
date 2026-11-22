import { bisection, rk2, rk4, romberg, simpson13, trapezoidal } from '../math/numerical'
import {
  lagrangeInterpolation,
  naturalCubicSpline,
  newtonDividedDifferences,
} from '../math/interpolation'

export type ScenarioParameters = {
  name: 'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO'
  description: string
  equation: string
}

export type DetentionParameters = { v0: number; acceleration: number }

export function module1Detention(scenario: ScenarioParameters, override?: Partial<DetentionParameters>) {
  const defaults = scenario.name === 'ESTRES'
    ? { v0: 24, acceleration: 2.8 }
    : scenario.name === 'MAL_CONDICIONADO'
      ? { v0: 24, acceleration: 0.4 }
      : { v0: 20, acceleration: 2 }
  const parameters = { ...defaults, ...override }
  const velocity = (t: number) => parameters.v0 - parameters.acceleration * t
  const root = bisection(velocity, 0, 100, 1e-8)
  const trapezoidalDistance = trapezoidal(velocity, 0, root.root, 1000)
  const simpsonDistance = simpson13(velocity, 0, root.root, 100)
  const rombergDistance = romberg(velocity, 0, root.root, 8, 1e-10)
  const referenceDistance = parameters.v0 * root.root - parameters.acceleration * root.root * root.root / 2
  const rk = rk4(
    (_t, state) => [state[1], -parameters.acceleration],
    [0, parameters.v0],
    0,
    root.root,
    0.01,
  )
  const rk2Solution = rk2(
    (_t, state) => [state[1], -parameters.acceleration],
    [0, parameters.v0],
    0,
    root.root,
    0.01,
  )
  return {
    scenario,
    parameters,
    stoppingTime: root.root,
    stoppingDistance: rombergDistance.value,
    trapezoidalDistance,
    simpsonDistance,
    rombergDistance: rombergDistance.value,
    rombergIterations: rombergDistance.iterations,
    rombergConverged: rombergDistance.converged,
    rombergTable: rombergDistance.table,
    rk2Solution,
    rk2FinalPosition: rk2Solution.at(-1)?.[2] ?? 0,
    referenceDistance,
    distanceError: Math.abs(rombergDistance.value - referenceDistance),
    iterations: root.iterations,
    finalPosition: rk.at(-1)?.[1] ?? 0,
  }
}

export type WindParameters = { mass: number; damping: number; stiffness: number; amplitude: number; duration: number; step: number }

export function module3Wind(scenario: ScenarioParameters, override?: Partial<WindParameters>) {
  const defaults = scenario.name === 'ESTRES'
    ? { mass: 1, damping: 0.8, stiffness: 4, amplitude: 3 }
    : scenario.name === 'MAL_CONDICIONADO'
      ? { mass: 1, damping: 0.02, stiffness: 4, amplitude: 3 }
      : { mass: 1, damping: 1.2, stiffness: 4, amplitude: 1 }
  const parameters = {
    ...defaults,
    duration: 20,
    step: 0.01,
    ...override,
  }
  const force = (t: number) => parameters.amplitude * Math.cos(2 * t)
  const solution = rk4(
    (t, state) => [
      state[1],
      (force(t) - parameters.damping * state[1] - parameters.stiffness * state[0]) / parameters.mass,
    ],
    [0, 0],
    0,
    parameters.duration,
    parameters.step,
  )
  const positions = solution.map(row => row[1])
  const rk2Solution = rk2(
    (t, state) => [
      state[1],
      (force(t) - parameters.damping * state[1] - parameters.stiffness * state[0]) / parameters.mass,
    ],
    [0, 0],
    0,
    parameters.duration,
    parameters.step,
  )
  const sampleCount = Math.ceil(parameters.duration / parameters.step)
  const freeReferencePoints = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const time = index * parameters.step
    const dampingRatio = parameters.damping / (2 * Math.sqrt(parameters.stiffness * parameters.mass))
    const naturalFrequency = Math.sqrt(parameters.stiffness / parameters.mass)
    const dampedFrequency = naturalFrequency * Math.sqrt(Math.max(0, 1 - dampingRatio * dampingRatio))
    const displacement = dampedFrequency > 0
      ? Math.exp(-dampingRatio * naturalFrequency * time)
        * (Math.cos(dampedFrequency * time)
          + (dampingRatio * naturalFrequency / dampedFrequency) * Math.sin(dampedFrequency * time))
      : 0
    return [time, 0, displacement]
  })
  const energyProxy = trapezoidal(t => {
    const state = solution.reduce((closest, row) =>
      Math.abs(row[0] - t) < Math.abs(closest[0] - t) ? row : closest,
    solution[0])
    return state[1] * state[1]
  }, 0, parameters.duration, 500)
  return {
    scenario,
    parameters,
    points: solution,
    rk2Points: rk2Solution,
    freeReferencePoints,
    maximumDisplacement: Math.max(...positions.map(Math.abs)),
    energyProxy,
  }
}

export function module2Deterioration(scenario: ScenarioParameters) {
  const parameters = scenario.name === 'ESTRES'
    ? { initialDeterioration: 12, alpha: 0.28, beta: 0.003, threshold: 30 }
    : scenario.name === 'MAL_CONDICIONADO'
      ? { initialDeterioration: 10, alpha: 0.05, beta: 0.0001, threshold: 12.4 }
      : { initialDeterioration: 10, alpha: 0.25, beta: 0.004, threshold: 30 }

  const deterioration = (time: number) =>
    parameters.initialDeterioration
    + parameters.alpha * time
    + parameters.beta * time * time

  const thresholdRoot = bisection(
    (time) => deterioration(time) - parameters.threshold,
    0,
    240,
    1e-8,
  )

  const positiveRoot = thresholdRoot.root
  const referenceAnalytical = (() => {
    const a = parameters.beta
    const b = parameters.alpha
    const c = parameters.initialDeterioration - parameters.threshold
    if (a === 0) return c === 0 ? 0 : -c / b
    const discriminant = b * b - 4 * a * c
    if (discriminant < 0) return Number.NaN
    const roots = [
      (-b + Math.sqrt(discriminant)) / (2 * a),
      (-b - Math.sqrt(discriminant)) / (2 * a),
    ]
    return roots.filter(root => root >= 0).sort((first, second) => first - second)[0] ?? Number.NaN
  })()

  return {
    scenario,
    parameters,
    thresholdTime: positiveRoot,
    analyticalThresholdTime: referenceAnalytical,
    thresholdError: Math.abs(positiveRoot - referenceAnalytical),
    iterations: thresholdRoot.iterations,
    converged: thresholdRoot.converged,
  }
}

export function lagrange(nodes: number[], values: number[], point: number): number {
  return lagrangeInterpolation(nodes, values, point)
}

export type SensorParameters = { step: number; nodeCount: number; noiseAmplitude: number }

export function module4Sensors(scenario: ScenarioParameters, override?: Partial<SensorParameters>) {
  const defaults = scenario.name === 'ESTRES'
    ? { step: 0.5, nodeCount: 9, noiseAmplitude: 0.08 }
    : scenario.name === 'MAL_CONDICIONADO'
      ? { step: 1.5, nodeCount: 9, noiseAmplitude: 0.25 }
      : { step: 0.25, nodeCount: 9, noiseAmplitude: 0 }
  const parameters = { ...defaults, ...override }
  const { step, nodeCount, noiseAmplitude } = parameters
  const nodes = Array.from({ length: nodeCount }, (_, index) => index * step)
  const values = nodes.map((time, index) =>
    Math.sin(time) + (noiseAmplitude === 0 ? 0 : Math.sin(index * (scenario.name === 'ESTRES' ? 4.1 : 2.7)) * noiseAmplitude),
  )
  const testPoints = [nodes[1] + step / 2, nodes[4] + step / 2, nodes[6] + step / 2]
  const lagrangeRecovered = testPoints.map(point => lagrangeInterpolation(nodes, values, point))
  const newtonRecovered = testPoints.map(point => newtonDividedDifferences(nodes, values).evaluate(point))
  const splineRecovered = testPoints.map(point => naturalCubicSpline(nodes, values).evaluate(point))
  const reference = testPoints.map(point => Math.sin(point))
  const meanError = (recovered: number[]) =>
    recovered.reduce((sum, value, index) => sum + Math.abs(value - reference[index]), 0) / recovered.length
  return {
    scenario,
    parameters: { step, hiddenTestCount: testPoints.length },
    nodes,
    testPoints,
    recovered: lagrangeRecovered,
    lagrangeRecovered,
    newtonRecovered,
    splineRecovered,
    reference,
    meanAbsoluteError: meanError(lagrangeRecovered),
    lagrangeError: meanError(lagrangeRecovered),
    newtonError: meanError(newtonRecovered),
    splineError: meanError(splineRecovered),
  }
}
