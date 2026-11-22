import type { ModuleRunRepository } from '@/application/ports/module-run.port'
import type {
  ModuleCode,
  ModuleRunSnapshot,
  ModuleRunSummary,
  ModuleScenario,
  SavedModuleRun,
} from '@/application/persistence/module-run.types'
import { db } from '@/infrastructure/database/postgrest.client'

interface ScenarioRow {
  id: number
  tipo: ModuleScenario
}

interface SimulationRow {
  id: number
  etiqueta_usuario: string | null
  equipo: string | null
  estado: string
  escenario: { tipo: ModuleScenario }
  parametros_entrada: { snapshot?: ModuleRunSnapshot }
  ejecucion_metodo: unknown[]
  conclusion_simulacion: Array<{ conclusion_numerica: string; conclusion_problema: string }> | {
    conclusion_numerica: string
    conclusion_problema: string
  } | null
}

export class ModuleRunPostgrestAdapter implements ModuleRunRepository {
  private async scenario(moduleCode: ModuleCode, scenario: ModuleScenario): Promise<ScenarioRow> {
    const rows = await db.select<{ id: number; escenario: ScenarioRow[] }>(
      'caso_estudio',
      `codigo=eq.${moduleCode}&select=id,escenario(id,tipo)`,
    )
    const item = rows[0]?.escenario.find(row => row.tipo === scenario)
    if (!item) throw new Error(`No existe el escenario ${scenario} del módulo ${moduleCode}`)
    return item
  }

  private async scenarioIds(moduleCode: ModuleCode): Promise<number[]> {
    const rows = await db.select<{ escenario: ScenarioRow[] }>(
      'caso_estudio',
      `codigo=eq.${moduleCode}&select=escenario(id,tipo)`,
    )
    return (rows[0]?.escenario ?? []).map(row => row.id)
  }

  async save(moduleCode: ModuleCode, snapshot: ModuleRunSnapshot, label?: string, team?: string): Promise<number> {
    const scenario = await this.scenario(moduleCode, snapshot.scenario)
    const [simulation] = await db.insert<{ id: number }>('simulacion', {
      escenario_id: scenario.id,
      etiqueta_usuario: label ?? `${moduleCode} ${snapshot.scenario}`,
      equipo: team ?? null,
      parametros_entrada: { snapshot },
      tolerancia: 1e-8,
      max_iteraciones: 10000,
      estado: 'COMPLETADA',
    })
    if (!simulation) throw new Error('No se pudo guardar la simulación')
    try {
      await this.persistChildren(simulation.id, snapshot)
    } catch (error) {
      await db.remove('simulacion', `id=eq.${simulation.id}`).catch(() => undefined)
      throw error
    }
    return simulation.id
  }

  async update(id: number, snapshot: ModuleRunSnapshot, label?: string, team?: string): Promise<void> {
    const scenario = await this.scenario(snapshot.moduleCode, snapshot.scenario)
    const rows = await db.update<{ id: number }>('simulacion', `id=eq.${id}`, {
      escenario_id: scenario.id,
      etiqueta_usuario: label ?? `${snapshot.moduleCode} ${snapshot.scenario}`,
      equipo: team ?? null,
      parametros_entrada: { snapshot },
      estado: 'COMPLETADA',
    })
    if (rows.length === 0) throw new Error(`La simulación #${id} ya no existe`)
    await db.remove('ejecucion_metodo', `simulacion_id=eq.${id}`)
    await db.remove('conclusion_simulacion', `simulacion_id=eq.${id}`)
    await this.persistChildren(id, snapshot)
  }

  async list(moduleCode: ModuleCode, search?: string): Promise<ModuleRunSummary[]> {
    const ids = await this.scenarioIds(moduleCode)
    if (ids.length === 0) return []
    const term = search?.trim()
    const filter = term ? `&etiqueta_usuario=ilike.*${encodeURIComponent(term)}*` : ''
    const rows = await db.select<{
      id: number
      etiqueta_usuario: string | null
      equipo: string | null
      estado: string
      creado_en: string
      escenario: { tipo: ModuleScenario }
    }>(
      'simulacion',
      `escenario_id=in.(${ids.join(',')})&select=id,etiqueta_usuario,equipo,estado,creado_en,escenario(tipo)&order=creado_en.desc&limit=100${filter}`,
    )
    return rows.map(row => ({
      id: row.id,
      label: row.etiqueta_usuario,
      team: row.equipo,
      scenario: row.escenario.tipo,
      estado: row.estado,
      createdAt: row.creado_en,
    }))
  }

  async load(id: number): Promise<SavedModuleRun> {
    const rows = await db.select<SimulationRow>(
      'simulacion',
      `id=eq.${id}&select=id,etiqueta_usuario,equipo,estado,escenario(tipo),parametros_entrada,ejecucion_metodo(*),conclusion_simulacion(*)`,
    )
    const row = rows[0]
    if (!row) throw new Error(`Simulación #${id} no encontrada`)
    const snapshot = row.parametros_entrada.snapshot
    if (!snapshot) throw new Error(`La simulación #${id} no contiene un snapshot reconocible`)
    return {
      id: row.id,
      label: row.etiqueta_usuario,
      team: row.equipo,
      scenario: row.escenario.tipo,
      snapshot,
    }
  }

  async remove(id: number): Promise<void> {
    await db.remove('simulacion', `id=eq.${id}`)
  }

  private async persistChildren(simulationId: number, snapshot: ModuleRunSnapshot): Promise<void> {
    const executions = await db.insert<{ id: number; metodo: string }>('ejecucion_metodo',
      snapshot.methods.map(method => ({
        simulacion_id: simulationId,
        familia_numerica: method.family,
        metodo: method.method,
        parametros_json: snapshot.parameters,
        tolerancia: 1e-8,
        paso: null,
        subintervalos: null,
        max_iteraciones: 10000,
        criterio_parada: 'Referencia, error y convergencia registrados',
        convergio: method.converged,
        iteraciones_totales: method.iterations,
        tiempo_ejecucion_ms: method.timeMs,
      })),
    )
    const methodIds = new Map(executions.map(row => [row.metodo, row.id]))
    await db.insert('iteracion_resultado', snapshot.methods.flatMap(method => {
      const executionId = methodIds.get(method.method)
      if (!executionId) return []
      return [{
        ejecucion_metodo_id: executionId,
        paso_k: 1,
        valor_json: method.solution,
        valor_fx: null,
        error_absoluto: method.absoluteError,
        error_relativo: method.relativeError,
        residual: method.residual,
        detalle_vector: null,
      }]
    }))
    await db.insert('resultado_resumen', snapshot.methods.map(method => {
      const executionId = methodIds.get(method.method)
      if (!executionId) return null
      return {
        ejecucion_metodo_id: executionId,
        solucion_final_json: { solution: method.solution },
        valor_referencia_json: { reference: method.reference },
        error_absoluto_final: method.absoluteError,
        error_relativo_final: method.relativeError,
        error_porcentual_final: method.percentageError,
        residual_final: method.residual,
        interpretacion: method.interpretation,
      }
    }).filter((row): row is NonNullable<typeof row> => row !== null))
    await db.insert('conclusion_simulacion', {
      simulacion_id: simulationId,
      conclusion_numerica: snapshot.numericalConclusion,
      conclusion_problema: snapshot.problemConclusion,
    })
  }
}
