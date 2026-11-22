import type { Module2Run, ScenarioType } from '@/domain/models/simulation.models'
import type { Module2Repository } from '../ports/module2.port'

export class GetModule2ScenarioUseCase {
    constructor(private readonly repository: Module2Repository) { }

    execute(type: ScenarioType): Promise<Module2Run> {
        return this.repository.run(type)
    }
}