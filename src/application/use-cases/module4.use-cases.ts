import { Module4Engine } from '@/application/services/module4.engine'
import type { Module4ParametersPort } from '@/application/ports/module4.port'
import type { ScenarioParameters } from '@/domain/models/four-module-models'

export class Module4UseCases {
  constructor(private readonly engine = new Module4Engine()) {}
  validate(parameters: Module4ParametersPort) { return this.engine.validate(parameters) }
  calculate(scenario: ScenarioParameters, parameters: Module4ParametersPort) {
    return this.engine.calculate(scenario, parameters)
  }
}
