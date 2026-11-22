import { bisection, rk4, trapezoidal } from '../math/numerical'

export type ScenarioParameters = {
  name: 'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO'
  description: string
  equation: string
}

export function module1Detention(scenario: ScenarioParameters) {
  const parameters = scenario.name === 'ESTRES'
    ? { v0: 24, acceleration: 2.8 }
    : scenario.name === 'MAL_CONDICIONADO'
      ? { v0: 24, acceleration: 0.4 }
      : { v0: 20, acceleration: 2 }
  const velocity = (t: number) => parameters.v0 - parameters.acceleration * t
  const root = bisection(velocity, 0, 100, 1e-8)
  const distance = trapezoidal(velocity, 0, root.root, 1000)
  const referenceDistance = parameters.v0 * root.root - parameters.acceleration * root.root * root.root / 2
  const rk = rk4(
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
    stoppingDistance: distance,
    referenceDistance,
    distanceError: Math.abs(distance - referenceDistance),
    iterations: root.iterations,
    finalPosition: rk.at(-1)?.[1] ?? 0,
  }
}

export function module3Wind(scenario: ScenarioParameters) {
  const parameters = scenario.name === 'ESTRES'
    ? { mass: 1, damping: 0.8, stiffness: 4, amplitude: 3 }
    : scenario.name === 'MAL_CONDICIONADO'
      ? { mass: 1, damping: 0.02, stiffness: 4, amplitude: 3 }
      : { mass: 1, damping: 1.2, stiffness: 4, amplitude: 1 }
  const force = (t: number) => parameters.amplitude * Math.cos(2 * t)
  const solution = rk4(
    (t, state) => [
      state[1],
      (force(t) - parameters.damping * state[1] - parameters.stiffness * state[0]) / parameters.mass,
    ],
    [0, 0],
    0,
    20,
    0.01,
  )
  const positions = solution.map(row => row[1])
  const energyProxy = trapezoidal(t => {
    const state = solution.reduce((closest, row) =>
      Math.abs(row[0] - t) < Math.abs(closest[0] - t) ? row : closest,
    solution[0])
    return state[1] * state[1]
  }, 0, 20, 500)
  return {
    scenario,
    parameters,
    points: solution,
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
  return nodes.reduce((sum, node, index) => {
    let basis = 1
    for (let other = 0; other < nodes.length; other++) {
      if (other !== index) basis *= (point - nodes[other]) / (node - nodes[other])
    }
    return sum + values[index] * basis
  }, 0)
}

export function module4Sensors(scenario: ScenarioParameters) {
  const step = scenario.name === 'ESTRES' ? 0.5 : scenario.name === 'MAL_CONDICIONADO' ? 1.5 : 0.25
  const nodes = Array.from({ length: 9 }, (_, index) => index * step)
  const values = nodes.map((time, index) =>
    Math.sin(time) + (scenario.name === 'ESTRES' ? Math.sin(index * 4.1) * 0.08 : scenario.name === 'MAL_CONDICIONADO' ? Math.sin(index * 2.7) * 0.25 : 0),
  )
  const testPoints = [nodes[1] + step / 2, nodes[4] + step / 2, nodes[6] + step / 2]
  const recovered = testPoints.map(point => lagrange(nodes, values, point))
  const reference = testPoints.map(point => Math.sin(point))
  const absoluteError = recovered.reduce((sum, value, index) => sum + Math.abs(value - reference[index]), 0) / recovered.length
  return {
    scenario,
    parameters: { step, hiddenTestCount: testPoints.length },
    nodes,
    testPoints,
    recovered,
    reference,
    meanAbsoluteError: absoluteError,
  }
}
