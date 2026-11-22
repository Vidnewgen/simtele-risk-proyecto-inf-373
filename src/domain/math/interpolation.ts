export type InterpolationPoint = {
  x: number
  y: number
}

export type NewtonResult = {
  coefficients: number[]
  evaluate: (x: number) => number
}

export type CubicSplineSegment = {
  x0: number
  x1: number
  a: number
  b: number
  c: number
  d: number
}

export type CubicSplineResult = {
  segments: CubicSplineSegment[]
  evaluate: (x: number) => number
}

function validateNodes(nodes: number[], values: number[]): void {
  if (nodes.length !== values.length) throw new Error('Nodos y valores deben tener la misma longitud')
  if (nodes.length < 2) throw new Error('Se requieren al menos dos nodos')
  for (let index = 0; index < nodes.length; index++) {
    if (!Number.isFinite(nodes[index]) || !Number.isFinite(values[index])) {
      throw new Error('Los nodos y valores deben ser finitos')
    }
    if (index > 0 && nodes[index] <= nodes[index - 1]) {
      throw new Error('Los nodos deben estar ordenados y ser únicos')
    }
  }
}

export function lagrangeInterpolation(nodes: number[], values: number[], point: number): number {
  validateNodes(nodes, values)
  if (!Number.isFinite(point)) throw new Error('El punto de evaluación debe ser finito')

  return nodes.reduce((sum, node, index) => {
    let basis = 1
    for (let other = 0; other < nodes.length; other++) {
      if (other !== index) basis *= (point - nodes[other]) / (node - nodes[other])
    }
    return sum + values[index] * basis
  }, 0)
}

export function newtonDividedDifferences(nodes: number[], values: number[]): NewtonResult {
  validateNodes(nodes, values)
  const divided: number[][] = Array.from({ length: nodes.length }, (_, index) =>
    Array(nodes.length).fill(0),
  )
  nodes.forEach((_, index) => {
    divided[index][0] = values[index]
  })
  for (let order = 1; order < nodes.length; order++) {
    for (let index = 0; index < nodes.length - order; index++) {
      divided[index][order] =
        (divided[index + 1][order - 1] - divided[index][order - 1])
        / (nodes[index + order] - nodes[index])
    }
  }

  const coefficients = nodes.map((_, index) => divided[0][index])
  const evaluate = (point: number): number => {
    if (!Number.isFinite(point)) throw new Error('El punto de evaluación debe ser finito')
    let result = coefficients.at(-1) ?? 0
    for (let index = coefficients.length - 2; index >= 0; index--) {
      result = result * (point - nodes[index]) + coefficients[index]
    }
    return result
  }

  return { coefficients, evaluate }
}

export function naturalCubicSpline(nodes: number[], values: number[]): CubicSplineResult {
  validateNodes(nodes, values)
  const count = nodes.length
  if (count === 2) {
    const h = nodes[1] - nodes[0]
    const segments: CubicSplineSegment[] = [{
      x0: nodes[0],
      x1: nodes[1],
      a: values[0],
      b: (values[1] - values[0]) / h,
      c: 0,
      d: 0,
    }]
    return {
      segments,
      evaluate: point => point <= nodes[0]
        ? values[0]
        : point >= nodes[1]
          ? values[1]
          : segments[0].a + segments[0].b * (point - nodes[0]),
    }
  }

  const h = nodes.slice(1).map((node, index) => node - nodes[index])
  const secondDerivative = Array(count).fill(0)
  const internalCount = count - 2
  const lower = Array(internalCount).fill(0)
  const diagonal = Array(internalCount).fill(0)
  const upper = Array(internalCount).fill(0)
  const rhs = Array(internalCount).fill(0)

  for (let local = 0; local < internalCount; local++) {
    const index = local + 1
    lower[local] = local === 0 ? 0 : h[index - 1]
    diagonal[local] = 2 * (h[index - 1] + h[index])
    upper[local] = local === internalCount - 1 ? 0 : h[index]
    rhs[local] = 6 * (
      (values[index + 1] - values[index]) / h[index]
      - (values[index] - values[index - 1]) / h[index - 1]
    )
  }

  for (let local = 1; local < internalCount; local++) {
    const factor = lower[local] / diagonal[local - 1]
    diagonal[local] -= factor * upper[local - 1]
    rhs[local] -= factor * rhs[local - 1]
  }

  const solution = Array(internalCount).fill(0)
  solution[internalCount - 1] = rhs[internalCount - 1] / diagonal[internalCount - 1]
  for (let local = internalCount - 2; local >= 0; local--) {
    solution[local] =
      (rhs[local] - upper[local] * solution[local + 1]) / diagonal[local]
  }
  solution.forEach((value, local) => {
    secondDerivative[local + 1] = value
  })

  const segments: CubicSplineSegment[] = []
  for (let index = 0; index < count - 1; index++) {
    const width = h[index]
    segments.push({
      x0: nodes[index],
      x1: nodes[index + 1],
      a: values[index],
      b: (values[index + 1] - values[index]) / width
        - width * (2 * secondDerivative[index] + secondDerivative[index + 1]) / 6,
      c: secondDerivative[index] / 2,
      d: (secondDerivative[index + 1] - secondDerivative[index]) / (6 * width),
    })
  }

  const evaluate = (point: number): number => {
    if (!Number.isFinite(point)) throw new Error('El punto de evaluación debe ser finito')
    if (point <= nodes[0]) return values[0]
    if (point >= nodes[count - 1]) return values[count - 1]
    let index = 0
    while (index < segments.length - 1 && point > segments[index].x1) index++
    const segment = segments[index]
    const dx = point - segment.x0
    return segment.a + segment.b * dx + segment.c * dx * dx + segment.d * dx * dx * dx
  }

  return { segments, evaluate }
}
