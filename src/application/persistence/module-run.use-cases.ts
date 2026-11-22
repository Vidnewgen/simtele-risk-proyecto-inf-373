import type { ModuleRunRepository } from '../ports/module-run.port'
import type {
  ModuleCode,
  ModuleRunSnapshot,
  ModuleRunSummary,
  SavedModuleRun,
} from './module-run.types'

export class ModuleRunUseCases {
  constructor(private readonly repository: ModuleRunRepository) {}

  save(moduleCode: ModuleCode, snapshot: ModuleRunSnapshot, label?: string, team?: string) {
    return this.repository.save(moduleCode, snapshot, label, team)
  }

  update(id: number, snapshot: ModuleRunSnapshot, label?: string, team?: string) {
    return this.repository.update(id, snapshot, label, team)
  }

  list(moduleCode: ModuleCode, search?: string): Promise<ModuleRunSummary[]> {
    return this.repository.list(moduleCode, search)
  }

  open(id: number): Promise<SavedModuleRun> {
    return this.repository.load(id)
  }

  remove(id: number): Promise<void> {
    return this.repository.remove(id)
  }
}
