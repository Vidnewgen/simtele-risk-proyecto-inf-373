import type { Module2Repository } from '@/application/ports/module2.port'
import { analyzeDeterioration, buildSystem } from '@/application/services/module2.engine'
import { conditionNumberSPD } from '@/domain/math/linear'
import {
    LINEAR_METHODS,
    ROOT_METHODS,
    type IterationRecord,
    type LinearMethodCode,
    type MethodCode,
    type MethodResult,
    type Module2Params,
    type Module2Run,
    type Module2ScenarioData,
    type RootMethodCode,
    type RootResult,
    type SaveMeta,
    type SavedSimulation,
    type ScenarioInfo,
    type ScenarioType,
    type SimulationSummary,
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

/* ------------------------------ filas de la BD ------------------------------ */

interface EscenarioRow {
    id: number
    tipo: ScenarioType
    nombre: string
    descripcion: string
    fuente_datos: string
    parametros_defecto: Module2Params
}

interface IterRow {
    paso_k: number
    valor_x: number | null
    valor_fx: number | null
    residual: number | null
    error_absoluto: number | null
    detalle_vector: number[] | null
}

interface ResumenRow {
    solucion_final_json: { x?: number[] | null; raiz?: number | null; f_raiz?: number | null }
    error_absoluto_final: number | null
    error_relativo_final: number | null
    error_porcentual_final: number | null
    residual_final: number | null
    numero_condicion: number | null
    interpretacion: string | null
}

interface EjecucionRow {
    id: number
    familia_numerica: string
    metodo: MethodCode
    convergio: boolean
    iteraciones_totales: number
    tiempo_ejecucion_ms: number
    resultado_resumen: ResumenRow | ResumenRow[] | null
    iteracion_resultado: IterRow[]
}

interface ConclusionRow {
    conclusion_numerica: string
    conclusion_problema: string
}

interface SimulacionRow {
    id: number
    etiqueta_usuario: string | null
    equipo: string | null
    estado: string
    creado_en: string
    parametros_entrada: { params?: Module2Params }
    escenario: { id: number; tipo: ScenarioType; nombre: string; descripcion: string }
    ejecucion_metodo: EjecucionRow[]
    conclusion_simulacion: ConclusionRow | ConclusionRow[] | null
}

/* -------------------------------- adaptador -------------------------------- */

export class Module2PostgrestAdapter implements Module2Repository {
    private async scenarioRows(): Promise<EscenarioRow[]> {
        const rows = await db.select<{ id: number; escenario: EscenarioRow[] }>(
            'caso_estudio',
            'codigo=eq.M2&select=id,escenario(id,tipo,nombre,descripcion,fuente_datos,parametros_defecto)',
        )
        return rows[0]?.escenario ?? []
    }

    async getScenario(type: ScenarioType): Promise<ScenarioInfo> {
        const row = (await this.scenarioRows()).find((e) => e.tipo === type)
        if (!row) throw new Error(`No existe el escenario ${type} del Módulo 2 en la base de datos`)
        if (typeof row.parametros_defecto.D0 !== 'number') {
            throw new Error('Los parámetros del escenario están desactualizados: aplica la migración 005_module2_week2.sql')
        }
        return {
            id: row.id,
            tipo: row.tipo,
            nombre: row.nombre,
            descripcion: row.descripcion,
            fuente: row.fuente_datos,
            params: row.parametros_defecto,
        }
    }

    /* ------------------------------- CREATE ------------------------------- */

    async save(run: Module2Run, meta: SaveMeta): Promise<number> {
        const [sim] = await db.insert<{ id: number }>('simulacion', this.simBody(run, meta))
        if (!sim) throw new Error('No se pudo crear la simulación')
        try {
            await this.persistChildren(sim.id, run)
        } catch (e) {
            // PostgREST no ofrece transacciones entre llamadas: se limpia lo que quedó a medias.
            await db.remove('simulacion', `id=eq.${sim.id}`).catch(() => undefined)
            throw e
        }
        return sim.id
    }

    /* ------------------------------- UPDATE ------------------------------- */

    /** Sobrescribe una simulación existente con un nuevo cálculo (mismo id). */
    async update(id: number, run: Module2Run, meta: SaveMeta): Promise<void> {
        const rows = await db.update<{ id: number }>('simulacion', `id=eq.${id}`, this.simBody(run, meta))
        if (rows.length === 0) throw new Error(`La simulación #${id} ya no existe`)
        try {
            await db.remove('ejecucion_metodo', `simulacion_id=eq.${id}`) // cascada: iteraciones y resúmenes
            await db.remove('conclusion_simulacion', `simulacion_id=eq.${id}`)
            await this.persistChildren(id, run)
        } catch (e) {
            await db.update('simulacion', `id=eq.${id}`, { estado: 'FALLIDA' }).catch(() => undefined)
            throw e
        }
    }

    async rename(id: number, meta: SaveMeta): Promise<void> {
        const rows = await db.update<{ id: number }>('simulacion', `id=eq.${id}`, {
            etiqueta_usuario: meta.label ?? null,
            equipo: meta.equipo ?? null,
        })
        if (rows.length === 0) throw new Error(`La simulación #${id} ya no existe`)
    }

    /* ------------------------------- DELETE ------------------------------- */

    async remove(id: number): Promise<void> {
        await db.remove('simulacion', `id=eq.${id}`) // ON DELETE CASCADE borra todo lo asociado
    }

    /* -------------------------------- READ -------------------------------- */

    async list(search?: string): Promise<SimulationSummary[]> {
        const ids = (await this.scenarioRows()).map((e) => e.id)
        if (ids.length === 0) return []
        const term = search?.trim()
        const filter = term ? `&etiqueta_usuario=ilike.*${encodeURIComponent(term)}*` : ''
        const rows = await db.select<{
            id: number
            etiqueta_usuario: string | null
            equipo: string | null
            estado: string
            creado_en: string
            escenario: { tipo: ScenarioType }
        }>(
            'simulacion',
            `escenario_id=in.(${ids.join(',')})&select=id,etiqueta_usuario,equipo,estado,creado_en,escenario(tipo)&order=creado_en.desc&limit=100${filter}`,
        )
        return rows.map((r) => ({
            id: r.id,
            etiqueta: r.etiqueta_usuario,
            equipo: r.equipo,
            tipo: r.escenario.tipo,
            estado: r.estado,
            creadoEn: r.creado_en,
        }))
    }

    async load(id: number): Promise<SavedSimulation> {
        const rows = await db.select<SimulacionRow>(
            'simulacion',
            `id=eq.${id}&select=*,escenario(id,tipo,nombre,descripcion),ejecucion_metodo(*,resultado_resumen(*),iteracion_resultado(paso_k,valor_x,valor_fx,residual,error_absoluto,detalle_vector)),conclusion_simulacion(*)`,
        )
        const s = rows[0]
        if (!s) throw new Error(`Simulación #${id} no encontrada`)

        const params = s.parametros_entrada.params
        if (!params || typeof params.D0 !== 'number') {
            throw new Error(`La simulación #${id} usa un formato de parámetros anterior. Elimínala y vuelve a guardarla.`)
        }

        const { A, b, xRef } = buildSystem(params)
        const analysis = analyzeDeterioration(params)
        const concl = one(s.conclusion_simulacion)

        const histories: Partial<Record<MethodCode, IterationRecord[]>> = {}
        for (const e of s.ejecucion_metodo) {
            const isRoot = e.familia_numerica === 'RAICES'
            histories[e.metodo] = [...e.iteracion_resultado]
                .sort((p, q) => p.paso_k - q.paso_k)
                .map((it) => ({
                    k: it.paso_k,
                    x: isRoot ? (it.valor_x === null ? [] : [it.valor_x]) : (it.detalle_vector ?? []),
                    residual: it.residual ?? 0,
                    fx: it.valor_fx,
                    error: it.error_absoluto,
                }))
        }

        const linearRows = s.ejecucion_metodo.filter((e) => e.familia_numerica === 'SISTEMAS_LINEALES')
        const rootRows = s.ejecucion_metodo.filter((e) => e.familia_numerica === 'RAICES')

        const linear: MethodResult[] = linearRows
            .map((e) => {
                const r = one(e.resultado_resumen)
                return {
                    method: e.metodo as LinearMethodCode,
                    converged: e.convergio,
                    iterations: e.iteraciones_totales,
                    solution: r?.solucion_final_json.x ?? null,
                    residualNorm: r?.residual_final ?? null,
                    absoluteError: r?.error_absoluto_final ?? null,
                    relativeError: r?.error_relativo_final ?? null,
                    percentageError: r?.error_porcentual_final ?? null,
                    timeMs: e.tiempo_ejecucion_ms,
                }
            })
            .sort((p, q) => LINEAR_METHODS.indexOf(p.method) - LINEAR_METHODS.indexOf(q.method))

        const roots: RootResult[] = rootRows
            .map((e) => {
                const r = one(e.resultado_resumen)
                return {
                    method: e.metodo as RootMethodCode,
                    converged: e.convergio,
                    iterations: e.iteraciones_totales,
                    root: r?.solucion_final_json.raiz ?? null,
                    fRoot: r?.solucion_final_json.f_raiz ?? null,
                    absoluteError: r?.error_absoluto_final ?? null,
                    relativeError: r?.error_relativo_final ?? null,
                    percentageError: r?.error_porcentual_final ?? null,
                    timeMs: e.tiempo_ejecucion_ms,
                    note: r?.interpretacion ?? '',
                }
            })
            .sort((p, q) => ROOT_METHODS.indexOf(p.method) - ROOT_METHODS.indexOf(q.method))

        const storedKappa = linearRows
            .map((e) => one(e.resultado_resumen)?.numero_condicion)
            .find((v): v is number => typeof v === 'number')

        const data: Module2ScenarioData = {
            type: s.escenario.tipo,
            title: s.escenario.nombre,
            description: s.escenario.descripcion,
            conditionNumber: storedKappa ?? conditionNumberSPD(A),
            tolerance: params.tolerancia,
            maxIterations: params.max_iter,
            matrixA: A,
            vectorB: b,
            exactSolution: xRef,
            results: linear,
            roots: { ...analysis, results: roots },
            numericalConclusion: concl?.conclusion_numerica ?? '',
            problemConclusion: concl?.conclusion_problema ?? '',
        }

        return {
            id: s.id,
            etiqueta: s.etiqueta_usuario,
            equipo: s.equipo,
            estado: s.estado,
            creadoEn: s.creado_en,
            tipo: s.escenario.tipo,
            run: { escenarioId: s.escenario.id, params, data, histories },
        }
    }

    /* ------------------------------ auxiliares ------------------------------ */

    private simBody(run: Module2Run, meta: SaveMeta) {
        const { data, params } = run
        return {
            escenario_id: run.escenarioId,
            etiqueta_usuario: meta.label ?? null,
            equipo: meta.equipo ?? null,
            parametros_entrada: { params, A: data.matrixA, b: data.vectorB, x_ref: data.exactSolution },
            tolerancia: params.tolerancia,
            max_iteraciones: params.max_iter,
            estado: 'COMPLETADA',
        }
    }

    private async persistChildren(simId: number, run: Module2Run): Promise<void> {
        const { data, params, histories } = run
        const xRef = data.exactSolution
        const tol = params.tolerancia
        const maxIter = params.max_iter

        // 1. una ejecución por método (sistemas lineales + raíces) en un solo POST
        const linearBodies = data.results.map((r) => {
            const direct = r.method === 'LU'
            return {
                simulacion_id: simId,
                familia_numerica: 'SISTEMAS_LINEALES',
                metodo: r.method,
                parametros_json: { n: params.n, matriz: params.matriz, perturbacion_b1: params.perturbacion_b1 },
                tolerancia: direct ? null : tol,
                max_iteraciones: direct ? null : maxIter,
                criterio_parada: direct ? 'Solución directa' : '||b - Ax||2 < tolerancia',
                convergio: r.converged,
                iteraciones_totales: r.iterations,
                tiempo_ejecucion_ms: r.timeMs,
            }
        })

        const rootParams = (m: RootMethodCode): object =>
            m === 'BISECCION' ? { a: params.a, b: params.b } : m === 'NEWTON_RAPHSON' ? { x0: params.x0 } : { s0: params.s0, s1: params.s1 }

        const rootBodies = data.roots.results.map((r) => ({
            simulacion_id: simId,
            familia_numerica: 'RAICES',
            metodo: r.method,
            parametros_json: rootParams(r.method),
            tolerancia: tol,
            max_iteraciones: maxIter,
            criterio_parada: '|f(x_k)| <= tolerancia',
            convergio: r.converged,
            iteraciones_totales: r.iterations,
            tiempo_ejecucion_ms: r.timeMs,
        }))

        const ejecuciones = await db.insert<{ id: number; metodo: MethodCode }>('ejecucion_metodo', [
            ...linearBodies,
            ...rootBodies,
        ])
        const idOf = new Map(ejecuciones.map((e) => [e.metodo, e.id] as const))

        // 2. iteraciones: dos POST (claves distintas según la familia, sin nulls en columnas JSONB)
        const linearIter = data.results.flatMap((r) => {
            const id = idOf.get(r.method)
            const hist: IterationRecord[] = histories[r.method] ?? []
            if (id === undefined) return []
            return thin(hist).map((h) => ({
                ejecucion_metodo_id: id,
                paso_k: h.k,
                detalle_vector: h.x,
                residual: h.residual,
                error_absoluto: h.error,
                error_relativo: null as number | null,
            }))
        })
        if (linearIter.length > 0) await db.insert('iteracion_resultado', linearIter)

        const rootIter = data.roots.results.flatMap((r) => {
            const id = idOf.get(r.method)
            const hist: IterationRecord[] = histories[r.method] ?? []
            if (id === undefined) return []
            return thin(hist).map((h) => ({
                ejecucion_metodo_id: id,
                paso_k: h.k,
                valor_x: h.x[0] ?? null,
                valor_fx: h.fx,
                residual: h.residual,
                error_absoluto: h.error,
                error_relativo:
                    h.error !== null && data.roots.analyticRoot ? h.error / Math.abs(data.roots.analyticRoot) : null,
            }))
        })
        if (rootIter.length > 0) await db.insert('iteracion_resultado', rootIter)

        // 3. resumen por método
        const linearSummary = data.results.map((r) => ({
            ejecucion_metodo_id: idOf.get(r.method),
            solucion_final_json: { x: r.solution },
            valor_referencia_json: { x_ref: xRef },
            error_absoluto_final: r.absoluteError,
            error_relativo_final: r.relativeError,
            error_porcentual_final: r.percentageError,
            residual_final: r.residualNorm,
            numero_condicion: data.conditionNumber,
            interpretacion: r.converged ? 'Convergió' : r.solution === null ? 'Divergió' : 'No alcanzó la tolerancia',
        }))
        const rootSummary = data.roots.results.map((r) => ({
            ejecucion_metodo_id: idOf.get(r.method),
            solucion_final_json: { raiz: r.root, f_raiz: r.fRoot },
            valor_referencia_json: { raiz_analitica: data.roots.analyticRoot },
            error_absoluto_final: r.absoluteError,
            error_relativo_final: r.relativeError,
            error_porcentual_final: r.percentageError,
            residual_final: r.fRoot === null ? null : Math.abs(r.fRoot),
            numero_condicion: data.roots.sensitivity.amplification, // amplificación de la raíz ante el umbral
            interpretacion: r.note,
        }))
        await db.insert('resultado_resumen', [...linearSummary, ...rootSummary])

        // 4. las dos conclusiones, una vez por simulación
        await db.insert('conclusion_simulacion', {
            simulacion_id: simId,
            conclusion_numerica: data.numericalConclusion,
            conclusion_problema: data.problemConclusion,
        })
    }
}