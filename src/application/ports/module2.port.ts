import type { Module2ScenarioData, ScenarioType } from '../../domain/models/simulation.models'

export interface Module2Repository {
    getByScenario(type: ScenarioType): Module2ScenarioData
}