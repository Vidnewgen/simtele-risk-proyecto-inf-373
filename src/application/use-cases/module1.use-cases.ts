import { Module1Engine } from '@/application/services/module1.engine'
import type { Module1ParametersPort } from '@/application/ports/module1.port'
import type { ScenarioParameters } from '@/domain/models/four-module-models'

export class Module1UseCases {
  constructor(private readonly engine = new Module1Engine()) {}
  validate(parameters: Module1ParametersPort) { return this.engine.validate(parameters) }
  calculate(scenario: ScenarioParameters, parameters: Module1ParametersPort) {
    return this.engine.calculate(scenario, parameters)
  }
}
