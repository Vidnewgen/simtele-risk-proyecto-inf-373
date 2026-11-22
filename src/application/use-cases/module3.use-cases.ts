import { Module3Engine } from '@/application/services/module3.engine'
import type { Module3ParametersPort } from '@/application/ports/module3.port'
import type { ScenarioParameters } from '@/domain/models/four-module-models'

export class Module3UseCases {
  constructor(private readonly engine = new Module3Engine()) {}
  validate(parameters: Module3ParametersPort) { return this.engine.validate(parameters) }
  calculate(scenario: ScenarioParameters, parameters: Module3ParametersPort) {
    return this.engine.calculate(scenario, parameters)
  }
}
