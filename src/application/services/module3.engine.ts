import { module3Wind, type ScenarioParameters } from '@/domain/models/four-module-models'
import type { Module3ParametersPort } from '@/application/ports/module3.port'

export class Module3Engine {
  validate(parameters: Module3ParametersPort): string[] {
    const errors: string[] = []
    if (!Number.isFinite(parameters.mass) || parameters.mass <= 0) errors.push('La masa debe ser mayor que cero')
    if (!Number.isFinite(parameters.damping) || parameters.damping < 0) errors.push('El amortiguamiento no puede ser negativo')
    if (!Number.isFinite(parameters.stiffness) || parameters.stiffness <= 0) errors.push('La rigidez debe ser mayor que cero')
    if (!Number.isFinite(parameters.amplitude) || parameters.amplitude < 0) errors.push('La amplitud no puede ser negativa')
    if (!Number.isFinite(parameters.duration) || parameters.duration <= 0) errors.push('La duración debe ser mayor que cero')
    if (!Number.isFinite(parameters.step) || parameters.step <= 0) errors.push('El paso debe ser mayor que cero')
    return errors
  }

  calculate(scenario: ScenarioParameters, parameters: Module3ParametersPort) {
    const errors = this.validate(parameters)
    if (errors.length) throw new Error(errors.join('. '))
    return module3Wind(scenario, parameters)
  }
}
