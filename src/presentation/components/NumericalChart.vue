<script setup lang="ts">
import { computed } from 'vue'

export interface ChartSeries {
  name: string
  values: number[]
  color: string
  dashed?: boolean
}

const props = defineProps<{
  title: string
  subtitle?: string
  xLabel: string
  yLabel: string
  series: ChartSeries[]
  xStart?: number
  xEnd?: number
  thresholdX?: number
  thresholdLabel?: string
  xLabels?: string[]
}>()

const width = 900
const height = 320
const left = 72
const right = 24
const top = 24
const bottom = 48
const plotWidth = width - left - right
const plotHeight = height - top - bottom

const bounds = computed(() => {
  const values = props.series.flatMap(series => series.values).filter(Number.isFinite)
  if (values.length === 0) return { min: -1, max: 1 }
  let min = Math.min(...values, props.thresholdX !== undefined ? 0 : Infinity)
  let max = Math.max(...values, props.thresholdX !== undefined ? 0 : -Infinity)
  if (min === max) {
    min -= 1
    max += 1
  } else {
    const padding = (max - min) * 0.12
    min -= padding
    max += padding
  }
  return { min, max }
})

const xPosition = (index: number, length: number) => {
  if (length <= 1) return left + plotWidth / 2
  return left + index / (length - 1) * plotWidth
}

const yPosition = (value: number) => {
  const range = bounds.value.max - bounds.value.min
  return top + (bounds.value.max - value) / range * plotHeight
}

const pathFor = (series: ChartSeries) =>
  series.values.map((value, index) =>
    `${index === 0 ? 'M' : 'L'} ${xPosition(index, series.values.length)} ${yPosition(value)}`
  ).join(' ')

const yTicks = computed(() => Array.from({ length: 5 }, (_, index) => {
  const ratio = index / 4
  return {
    y: top + ratio * plotHeight,
    value: bounds.value.max - ratio * (bounds.value.max - bounds.value.min),
  }
}))

const xTicks = computed(() => {
  const labels = props.xLabels
  if (labels?.length) {
    return labels.map((label, index) => ({
      x: labels.length === 1
        ? left + plotWidth / 2
        : left + index / (labels.length - 1) * plotWidth,
      label,
    }))
  }
  return Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4
    const start = props.xStart ?? 0
    const end = props.xEnd ?? Math.max(props.series[0].values.length - 1, 1)
    return {
      x: left + ratio * plotWidth,
      label: (start + ratio * (end - start)).toFixed(end - start < 10 ? 1 : 0),
    }
  })
})

const thresholdPosition = computed(() => {
  if (props.thresholdX === undefined) return null
  const start = props.xStart ?? 0
  const end = props.xEnd ?? 1
  return left + ((props.thresholdX - start) / (end - start)) * plotWidth
})

const formatTick = (value: number) => {
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) return value.toExponential(1)
  return value.toFixed(Math.abs(value) < 10 ? 2 : 1)
}
</script>

<template>
  <figure class="chart-card">
    <header>
      <div>
        <h3>{{ title }}</h3>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="legend" aria-label="Leyenda">
        <span v-for="item in series" :key="item.name">
          <i :style="{ background: item.color }"></i>{{ item.name }}
        </span>
      </div>
    </header>

    <svg :viewBox="`0 0 ${width} ${height}`" role="img" :aria-label="title">
      <g v-for="tick in yTicks" :key="tick.y">
        <line :x1="left" :x2="width - right" :y1="tick.y" :y2="tick.y" class="grid-line" />
        <text :x="left - 12" :y="tick.y + 4" text-anchor="end" class="tick-label">{{ formatTick(tick.value) }}</text>
      </g>
      <g v-for="tick in xTicks" :key="tick.x">
        <line :x1="tick.x" :x2="tick.x" :y1="top" :y2="height - bottom" class="grid-line vertical" />
        <text :x="tick.x" :y="height - 18" text-anchor="middle" class="tick-label">{{ tick.label }}</text>
      </g>

      <line :x1="left" :x2="left" :y1="top" :y2="height - bottom" class="axis" />
      <line :x1="left" :x2="width - right" :y1="height - bottom" :y2="height - bottom" class="axis" />

      <g v-if="thresholdPosition !== null">
        <line :x1="thresholdPosition" :x2="thresholdPosition" :y1="top" :y2="height - bottom" class="threshold-line" />
        <rect :x="Math.min(thresholdPosition + 8, width - right - 145)" y="34" width="137" height="24" rx="5" class="threshold-label-bg" />
        <text :x="Math.min(thresholdPosition + 76, width - right - 77)" y="50" text-anchor="middle" class="threshold-label">
          {{ thresholdLabel }}
        </text>
      </g>

      <g v-for="item in series" :key="item.name">
        <path :d="pathFor(item)" fill="none" :stroke="item.color" :stroke-width="3" :stroke-dasharray="item.dashed ? '8 6' : undefined" />
        <circle v-for="(value, index) in item.values.filter((_, index) => index === 0 || index === item.values.length - 1)"
          :key="`${item.name}-${index}`"
          :cx="xPosition(index === 0 ? 0 : item.values.length - 1, item.values.length)"
          :cy="yPosition(value)"
          r="4"
          :fill="item.color"
        />
      </g>

      <text :x="(left + width - right) / 2" :y="height - 2" text-anchor="middle" class="axis-label">{{ xLabel }}</text>
      <text :transform="`translate(16 ${(top + height - bottom) / 2}) rotate(-90)`" text-anchor="middle" class="axis-label">{{ yLabel }}</text>
    </svg>
  </figure>
</template>

<style scoped>
.chart-card { border: 1px solid #dbe3ef; border-radius: 12px; padding: 1rem 1.25rem 0.5rem; margin: 0 0 1.5rem; background: linear-gradient(180deg, #fff 0%, #f8fafc 100%); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05); }
header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
h3 { margin: 0; font-size: 1rem; }
header p { margin: 0.25rem 0 0; color: #64748b; font-size: 0.78rem; }
.legend { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.65rem; color: #475569; font-size: 0.78rem; }
.legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
.legend i { width: 18px; height: 3px; border-radius: 999px; }
svg { display: block; width: 100%; max-height: 330px; }
.grid-line { stroke: #e2e8f0; stroke-width: 1; }
.grid-line.vertical { stroke-dasharray: 3 5; }
.axis { stroke: #94a3b8; stroke-width: 1.5; }
.tick-label, .axis-label { fill: #64748b; font-size: 12px; }
.axis-label { font-weight: 700; }
.threshold-line { stroke: #ef4444; stroke-width: 2; stroke-dasharray: 7 5; }
.threshold-label-bg { fill: #fff1f2; stroke: #fecdd3; }
.threshold-label { fill: #be123c; font-size: 11px; font-weight: 800; }
@media (max-width: 720px) { header { flex-direction: column; } .legend { justify-content: flex-start; } }
</style>
