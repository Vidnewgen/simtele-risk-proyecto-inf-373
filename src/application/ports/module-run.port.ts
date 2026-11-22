import type {
  ModuleCode,
  ModuleRunSnapshot,
  ModuleRunSummary,
  SavedModuleRun,
} from '../persistence/module-run.types'

export interface ModuleRunRepository {
  save(moduleCode: ModuleCode, snapshot: ModuleRunSnapshot, label?: string, team?: string): Promise<number>
  update(id: number, snapshot: ModuleRunSnapshot, label?: string, team?: string): Promise<void>
  list(moduleCode: ModuleCode, search?: string): Promise<ModuleRunSummary[]>
  load(id: number): Promise<SavedModuleRun>
  remove(id: number): Promise<void>
}
