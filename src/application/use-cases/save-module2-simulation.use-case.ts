import type { Module2Run } from '@/domain/models/simulation.models'
import type { Module2Repository } from '../ports/module2.port'

export class SaveModule2SimulationUseCase {
    constructor(private readonly repository: Module2Repository) { }

    execute(run: Module2Run, label?: string): Promise<number> {
        return this.repository.save(run, label)
    }
}