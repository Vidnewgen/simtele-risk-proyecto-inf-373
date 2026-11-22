export interface ChartPoint {
    x: number
    y: number
}

export interface ChartSeries {
    name: string
    color: string
    points: ChartPoint[]
    dashed?: boolean
    dots?: boolean
}