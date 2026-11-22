import { module4Sensors, type ScenarioParameters } from '@/domain/models/four-module-models'
import type { Module4ParametersPort } from '@/application/ports/module4.port'

export class Module4Engine {
  validate(parameters: Module4ParametersPort): string[] {
    const errors: string[] = []
    if (!Number.isFinite(parameters.step) || parameters.step <= 0) errors.push('El paso debe ser mayor que cero')
    if (!Number.isInteger(parameters.nodeCount) || parameters.nodeCount < 7) errors.push('Se requieren al menos siete nodos')
    if (!Number.isFinite(parameters.noiseAmplitude) || parameters.noiseAmplitude < 0) errors.push('El ruido no puede ser negativo')
    return errors
  }

  calculate(scenario: ScenarioParameters, parameters: Module4ParametersPort) {
    const errors = this.validate(parameters)
    if (errors.length) throw new Error(errors.join('. '))
    return module4Sensors(scenario, parameters)
  }
}
