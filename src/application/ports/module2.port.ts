import type {
    Module2Run,
    Module2ScenarioData,
    ScenarioType,
    SimulationSummary,
} from '@/domain/models/simulation.models'

export interface Module2Repository {
    run(type: ScenarioType): Promise<Module2Run>
    save(run: Module2Run, label?: string): Promise<number>
    list(): Promise<SimulationSummary[]>
    load(id: number): Promise<Module2ScenarioData>
}