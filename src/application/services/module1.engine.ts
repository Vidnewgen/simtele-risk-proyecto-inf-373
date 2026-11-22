import { module1Detention, type ScenarioParameters } from '@/domain/models/four-module-models'
import type { Module1ParametersPort } from '@/application/ports/module1.port'

export class Module1Engine {
  validate(parameters: Module1ParametersPort): string[] {
    const errors: string[] = []
    if (!Number.isFinite(parameters.v0) || parameters.v0 <= 0) errors.push('v₀ debe ser mayor que cero')
    if (!Number.isFinite(parameters.acceleration) || parameters.acceleration <= 0) errors.push('La desaceleración debe ser mayor que cero')
    return errors
  }

  calculate(scenario: ScenarioParameters, parameters: Module1ParametersPort) {
    const errors = this.validate(parameters)
    if (errors.length) throw new Error(errors.join('. '))
    return module1Detention(scenario, parameters)
  }
}
