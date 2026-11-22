export type ModuleCode = 'M1' | 'M3' | 'M4'
export type ModuleScenario = 'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO'

export interface ModuleMethodResult {
  family: 'ERRORES' | 'INTERPOLACION' | 'RAICES' | 'INTEGRACION' | 'EDO'
  method: string
  converged: boolean
  iterations: number
  timeMs: number
  solution: unknown
  reference: unknown
  absoluteError: number | null
  relativeError: number | null
  percentageError: number | null
  residual: number | null
  interpretation: string
}

export interface ModuleRunSnapshot {
  moduleCode: ModuleCode
  scenario: ModuleScenario
  parameters: Record<string, unknown>
  methods: ModuleMethodResult[]
  charts: Array<{ title: string; series: unknown }>
  numericalConclusion: string
  problemConclusion: string
  savedAt: string
}

export interface ModuleRunSummary {
  id: number
  label: string | null
  team: string | null
  scenario: ModuleScenario
  estado: string
  createdAt: string
}

export interface SavedModuleRun {
  id: number
  label: string | null
  team: string | null
  scenario: ModuleScenario
  snapshot: ModuleRunSnapshot
}
