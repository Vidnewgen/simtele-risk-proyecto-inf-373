import { runModule2, validateParams, verifyRun } from '@/application/services/module2.engine'
import type {
    Module2Params,
    Module2Run,
    SaveMeta,
    SavedSimulation,
    ScenarioInfo,
    ScenarioType,
    SimulationSummary,
    VerificationReport,
} from '@/domain/models/simulation.models'
import type { Module2Repository } from '../ports/module2.port'

export class Module2UseCases {
    constructor(private readonly repo: Module2Repository) { }

    validate(params: Module2Params): string[] {
        return validateParams(params)
    }

    loadScenario(type: ScenarioType): Promise<ScenarioInfo> {
        return this.repo.getScenario(type)
    }

    /** Calcula en memoria (no guarda). Lanza si los parámetros no son válidos. */
    calculate(info: ScenarioInfo, params: Module2Params): Module2Run {
        const errors = validateParams(params)
        if (errors.length > 0) throw new Error(errors.join(' · '))
        return runModule2(info.tipo, info.id, { title: info.nombre, description: info.descripcion }, params)
    }

    save(run: Module2Run, meta: SaveMeta): Promise<number> {
        return this.repo.save(run, meta)
    }

    update(id: number, run: Module2Run, meta: SaveMeta): Promise<void> {
        return this.repo.update(id, run, meta)
    }

    rename(id: number, meta: SaveMeta): Promise<void> {
        return this.repo.rename(id, meta)
    }

    remove(id: number): Promise<void> {
        return this.repo.remove(id)
    }

    list(search?: string): Promise<SimulationSummary[]> {
        return this.repo.list(search)
    }

    open(id: number): Promise<SavedSimulation> {
        return this.repo.load(id)
    }

    /** Recupera lo guardado, recalcula con los mismos parámetros y compara. */
    async relaunch(
        id: number,
    ): Promise<{ saved: SavedSimulation; fresh: Module2Run; report: VerificationReport }> {
        const saved = await this.repo.load(id)
        const errors = validateParams(saved.run.params)
        if (errors.length > 0) throw new Error(`Parámetros guardados no válidos: ${errors.join(' · ')}`)
        const fresh = runModule2(
            saved.tipo,
            saved.run.escenarioId,
            { title: saved.run.data.title, description: saved.run.data.description },
            saved.run.params,
        )
        return { saved, fresh, report: verifyRun(saved.run, fresh) }
    }
}