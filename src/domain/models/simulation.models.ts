export type ScenarioType = 'NORMAL' | 'ESTRES' | 'MAL_CONDICIONADO';

export interface MethodResult {
    method: string;
    converged: boolean;
    iterations: number;
    solution: string;
    residualNorm: string;
    absoluteError: string;
    relativeError: string;
    percentageError: string;
}

export interface Module2ScenarioData {
    type: ScenarioType;
    title: string;
    description: string;
    conditionNumber: string;
    tolerance: string;
    matrixA: number[][];
    vectorB: number[];
    exactSolution: number[];
    results: MethodResult[];
    numericalConclusion: string;
    problemConclusion: string;
}