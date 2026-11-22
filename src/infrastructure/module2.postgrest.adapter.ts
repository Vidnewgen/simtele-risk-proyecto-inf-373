import type { Module2Repository } from '@/application/ports/module2.port'
import { runModule2 } from '@/application/services/module2.engine'
import { absoluteError, relativeError } from '@/domain/math/errors'
import type { Matrix } from '@/domain/math/linear'
import type {
    IterationRecord,
    MethodCode,
    MethodResult,
    Module2Params,
    Module2Run,
    Module2ScenarioData,
    ScenarioType,
    SimulationSummary,
} from '@/domain/models/simulation.models'
import { db } from '@/infrastructure/database/postgrest.client'

const MAX_ITER_ROWS = 1000 // tope de filas de iteración guardadas por método

function thin<T>(arr: T[]): T[] {
    if (arr.length <= MAX_ITER_ROWS) return arr
    const step = Math.ceil(arr.length / MAX_ITER_ROWS)
    const out = arr.filter((_, i) => i % step === 0)
    const last = arr[arr.length - 1] as T
    if (out[out.length - 1] !== last) out.push(last)
    return out
}

// PostgREST devuelve objeto o arreglo según la relación; esto lo normaliza.
const one = <T>(v: T | T[] | null | undefined): T | undefined =>
    Array.isArray(v) ? v[0] : (v ?? undefined)

interface EscenarioRow {
    id: number
    nombre: string
    descripcion: string
    parametros_defecto: Module2Params
}

interface ResumenRow {
    solucion_final_json: { x: number[] | null }
    error_absoluto_final: number | null
    error_relativo_final: number | null
    error_porcentual_final: number | null
    residual_final: number | null
    numero_condicion: number | null
}

interface EjecucionRow {
    id: number
    metodo: MethodCode
    convergio: boolean
    iteraciones_totales: number
    tiempo_ejecucion_ms: number
    resultado_resumen: ResumenRow | ResumenRow[] | null
}

interface ConclusionRow {
    conclusion_numerica: string
    conclusion_problema: string
}

interface SimulacionRow {
    id: number
    tolerancia: number
    max_iteraciones: number
    parametros_entrada: { params: Module2Params; A: Matrix; b: number[]; x_ref: number[] }
    escenario: { tipo: ScenarioType; nombre: string; descripcion: string }
    ejecucion_metodo: EjecucionRow[]
    conclusion_simulacion: ConclusionRow | ConclusionRow[] | null
}

export class Module2PostgrestAdapter implements Module2Repository {
    async run(type: ScenarioType): Promise<Module2Run> {
        const rows = await db.select<EscenarioRow>(
            'escenario',
            `tipo=eq.${type}&caso_estudio.codigo=eq.M2&select=id,nombre,descripcion,parametros_defecto,caso_estudio!inner(codigo)`,
        )
        const row = rows[0]
        if (!row) {
            throw new Error(`No existe el escenario ${type} del Módulo 2 en la base de datos`)
        }
        return runModule2(
            type,
            row.id,
            { title: row.nombre, description: row.descripcion },
            row.parametros_defecto,
        )
    }

    async save(run: Module2Run, label?: string): Promise<number> {
        const { data, params, histories } = run
        const xRef = data.exactSolution

        // 1. simulación
        const [sim] = await db.insert<{ id: number }>('simulacion', {
            escenario_id: run.escenarioId,
            etiqueta_usuario: label ?? null,
            parametros_entrada: { params, A: data.matrixA, b: data.vectorB, x_ref: xRef },
            tolerancia: data.tolerance,
            max_iteraciones: data.maxIterations,
            estado: 'COMPLETADA',
        })
        if (!sim) throw new Error('No se pudo crear la simulación')

        // 2. una ejecución por método
        const ejecuciones = await db.insert<{ id: number; metodo: MethodCode }>(
            'ejecucion_metodo',
            data.results.map((r) => {
                const direct = r.method === 'LU'
                return {
                    simulacion_id: sim.id,
                    familia_numerica: 'SISTEMAS_LINEALES',
                    metodo: r.method,
                    parametros_json: { n: params.n, matriz: params.matriz },
                    tolerancia: direct ? null : data.tolerance,
                    max_iteraciones: direct ? null : data.maxIterations,
                    criterio_parada: direct ? 'Solución directa' : '||b - Ax||₂ < tolerancia',
                    convergio: r.converged,
                    iteraciones_totales: r.iterations,
                    tiempo_ejecucion_ms: r.timeMs,
                }
            }),
        )
        const idOf = new Map(ejecuciones.map((e) => [e.metodo, e.id]))

        // 3. iteraciones (un solo POST con todas las filas)
        const iterRows = data.results.flatMap((r) => {
            const id = idOf.get(r.method)
            const hist: IterationRecord[] = histories[r.method] ?? []
            if (id === undefined) return []
            return thin(hist).map((h) => ({
                ejecucion_metodo_id: id,
                paso_k: h.k,
                detalle_vector: h.x,
                residual: h.residual,
                error_absoluto: absoluteError(h.x, xRef),
                error_relativo: relativeError(h.x, xRef),
            }))
        })
        if (iterRows.length > 0) await db.insert('iteracion_resultado', iterRows)

        // 4. resumen por método
        await db.insert(
            'resultado_resumen',
            data.results.map((r) => ({
                ejecucion_metodo_id: idOf.get(r.method),
                solucion_final_json: { x: r.solution },
                valor_referencia_json: { x_ref: xRef },
                error_absoluto_final: r.absoluteError,
                error_relativo_final: r.relativeError,
                error_porcentual_final: r.percentageError,
                residual_final: r.residualNorm,
                numero_condicion: data.conditionNumber,
                interpretacion: r.converged
                    ? 'Convergió'
                    : r.solution === null
                        ? 'Divergió'
                        : 'No alcanzó la tolerancia',
            })),
        )

        // 5. las dos conclusiones, una vez por simulación
        await db.insert('conclusion_simulacion', {
            simulacion_id: sim.id,
            conclusion_numerica: data.numericalConclusion,
            conclusion_problema: data.problemConclusion,
        })

        return sim.id
    }

    async list(): Promise<SimulationSummary[]> {
        const rows = await db.select<{
            id: number
            etiqueta_usuario: string | null
            creado_en: string
            escenario: { tipo: ScenarioType }
        }>(
            'simulacion',
            'select=id,etiqueta_usuario,creado_en,escenario(tipo)&order=creado_en.desc&limit=50',
        )
        return rows.map((r) => ({
            id: r.id,
            etiqueta: r.etiqueta_usuario,
            tipo: r.escenario.tipo,
            creadoEn: r.creado_en,
        }))
    }

    async load(id: number): Promise<Module2ScenarioData> {
        const rows = await db.select<SimulacionRow>(
            'simulacion',
            `id=eq.${id}&select=*,escenario(tipo,nombre,descripcion),ejecucion_metodo(*,resultado_resumen(*)),conclusion_simulacion(*)`,
        )
        const s = rows[0]
        if (!s) throw new Error(`Simulación ${id} no encontrada`)

        const concl = one(s.conclusion_simulacion)
        let kappa: number | null = null

        const results: MethodResult[] = s.ejecucion_metodo.map((e) => {
            const res = one(e.resultado_resumen)
            if (res && res.numero_condicion !== null) kappa = res.numero_condicion
            return {
                method: e.metodo,
                converged: e.convergio,
                iterations: e.iteraciones_totales,
                solution: res?.solucion_final_json.x ?? null,
                residualNorm: res?.residual_final ?? null,
                absoluteError: res?.error_absoluto_final ?? null,
                relativeError: res?.error_relativo_final ?? null,
                percentageError: res?.error_porcentual_final ?? null,
                timeMs: e.tiempo_ejecucion_ms,
            }
        })

        const order: MethodCode[] = ['JACOBI', 'GAUSS_SEIDEL', 'GRADIENTE_CONJUGADO', 'LU']
        results.sort((a, b) => order.indexOf(a.method) - order.indexOf(b.method))

        return {
            type: s.escenario.tipo,
            title: s.escenario.nombre,
            description: s.escenario.descripcion,
            conditionNumber: kappa,
            tolerance: s.tolerancia,
            maxIterations: s.max_iteraciones,
            matrixA: s.parametros_entrada.A,
            vectorB: s.parametros_entrada.b,
            exactSolution: s.parametros_entrada.x_ref,
            results,
            numericalConclusion: concl?.conclusion_numerica ?? '',
            problemConclusion: concl?.conclusion_problema ?? '',
        }
    }
}