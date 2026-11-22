import type {
    Module2Run,
    SaveMeta,
    SavedSimulation,
    ScenarioInfo,
    ScenarioType,
    SimulationSummary,
} from '@/domain/models/simulation.models'

export interface Module2Repository {
    getScenario(type: ScenarioType): Promise<ScenarioInfo>
    save(run: Module2Run, meta: SaveMeta): Promise<number>
    update(id: number, run: Module2Run, meta: SaveMeta): Promise<void>
    rename(id: number, meta: SaveMeta): Promise<void>
    remove(id: number): Promise<void>
    list(search?: string): Promise<SimulationSummary[]>
    load(id: number): Promise<SavedSimulation>
}