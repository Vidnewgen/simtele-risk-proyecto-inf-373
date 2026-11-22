<script setup lang="ts">
import { computed } from 'vue'
import type { ChartSeries } from './chart.types'

const props = withDefaults(
    defineProps<{
        title: string
        series: ChartSeries[]
        xLabel?: string
        yLabel?: string
        logX?: boolean
        logY?: boolean
    }>(),
    { xLabel: '', yLabel: '', logX: false, logY: false },
)

const W = 640
const H = 320
const ML = 66
const MR = 16
const MT = 12
const MB = 46

const toX = (v: number): number => (props.logX ? Math.log10(v) : v)
const toY = (v: number): number => (props.logY ? Math.log10(v) : v)

const prepared = computed(() =>
    props.series.map((s) => ({
        name: s.name,
        color: s.color,
        dashed: s.dashed ?? false,
        dots: s.dots ?? false,
        pts: s.points
            .filter(
                (p) =>
                    Number.isFinite(p.x) &&
                    Number.isFinite(p.y) &&
                    (!props.logX || p.x > 0) &&
                    (!props.logY || p.y > 0),
            )
            .map((p) => ({ x: toX(p.x), y: toY(p.y) })),
    })),
)

const domain = computed(() => {
    let xmin = Infinity
    let xmax = -Infinity
    let ymin = Infinity
    let ymax = -Infinity
    for (const s of prepared.value) {
        for (const p of s.pts) {
            if (p.x < xmin) xmin = p.x
            if (p.x > xmax) xmax = p.x
            if (p.y < ymin) ymin = p.y
            if (p.y > ymax) ymax = p.y
        }
    }
    if (!Number.isFinite(xmin)) return null
    if (xmax === xmin) {
        xmin -= 1
        xmax += 1
    }
    if (ymax === ymin) {
        ymin -= 1
        ymax += 1
    }
    const pad = (ymax - ymin) * 0.05
    return { xmin, xmax, ymin: ymin - pad, ymax: ymax + pad }
})

const fmt = (v: number): string => {
    if (v === 0) return '0'
    const a = Math.abs(v)
    return a >= 1e5 || a < 1e-2 ? v.toExponential(1) : String(Number(v.toPrecision(4)))
}

interface Tick {
    pos: number
    label: string
}

function makeTicks(min: number, max: number, log: boolean): Tick[] {
    if (log) {
        const lo = Math.ceil(min)
        const hi = Math.floor(max)
        if (hi >= lo) {
            const step = Math.max(1, Math.ceil((hi - lo + 1) / 6))
            const out: Tick[] = []
            for (let e = lo; e <= hi; e += step) out.push({ pos: e, label: `1e${e}` })
            return out
        }
        return [min, (min + max) / 2, max].map((v) => ({ pos: v, label: fmt(10 ** v) }))
    }
    return Array.from({ length: 5 }, (_, i) => {
        const v = min + ((max - min) * i) / 4
        return { pos: v, label: fmt(v) }
    })
}

const layout = computed(() => {
    const d = domain.value
    if (!d) return null
    const sx = (v: number): number => ML + ((v - d.xmin) / (d.xmax - d.xmin)) * (W - ML - MR)
    const sy = (v: number): number => H - MB - ((v - d.ymin) / (d.ymax - d.ymin)) * (H - MT - MB)

    const paths = prepared.value.map((s) => ({
        name: s.name,
        color: s.color,
        dashed: s.dashed,
        d: s.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' '),
        circles: s.pts.map((p) => ({ cx: sx(p.x), cy: sy(p.y) })),
        showDots: s.dots || s.pts.length <= 25,
    }))
    const xt = makeTicks(d.xmin, d.xmax, props.logX).map((t) => ({ x: sx(t.pos), label: t.label }))
    const yt = makeTicks(d.ymin, d.ymax, props.logY).map((t) => ({ y: sy(t.pos), label: t.label }))
    return { paths, xt, yt }
})
</script>

<template>
    <figure class="chart">
        <figcaption>{{ title }}</figcaption>

        <svg v-if="layout" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="title">
            <g class="grid">
                <line v-for="(t, i) in layout.yt" :key="'gy' + i" :x1="ML" :x2="W - MR" :y1="t.y" :y2="t.y" />
                <line v-for="(t, i) in layout.xt" :key="'gx' + i" :x1="t.x" :x2="t.x" :y1="MT" :y2="H - MB" />
            </g>
            <rect :x="ML" :y="MT" :width="W - ML - MR" :height="H - MT - MB" class="frame" />

            <text v-for="(t, i) in layout.yt" :key="'ty' + i" :x="ML - 6" :y="t.y + 4" class="tick" text-anchor="end">
                {{ t.label }}
            </text>
            <text v-for="(t, i) in layout.xt" :key="'tx' + i" :x="t.x" :y="H - MB + 16" class="tick"
                text-anchor="middle">
                {{ t.label }}
            </text>
            <text :x="(ML + W - MR) / 2" :y="H - 8" class="axis" text-anchor="middle">{{ xLabel }}</text>
            <text :transform="`translate(14 ${(MT + H - MB) / 2}) rotate(-90)`" class="axis" text-anchor="middle">
                {{ yLabel }}
            </text>

            <template v-for="(s, i) in layout.paths" :key="'s' + i">
                <path :d="s.d" fill="none" :stroke="s.color" stroke-width="2"
                    :stroke-dasharray="s.dashed ? '6 4' : undefined" />
                <template v-if="s.showDots">
                    <circle v-for="(c, j) in s.circles" :key="'c' + i + '-' + j" :cx="c.cx" :cy="c.cy" r="3.5"
                        :fill="s.color" />
                </template>
            </template>
        </svg>
        <p v-else class="empty">Sin datos para graficar.</p>

        <ul class="legend">
            <li v-for="(s, i) in series" :key="'l' + i">
                <span class="swatch" :style="{ background: s.color }"></span>{{ s.name }}
            </li>
        </ul>
    </figure>
</template>

<style scoped>
.chart {
    margin: 0;
}

figcaption {
    font-weight: 600;
    margin-bottom: 0.4rem;
    font-size: 0.95rem;
}

svg {
    width: 100%;
    height: auto;
    background: #fff;
}

.grid line {
    stroke: #e2e8f0;
    stroke-width: 1;
}

.frame {
    fill: none;
    stroke: #94a3b8;
}

.tick {
    font-size: 11px;
    fill: #475569;
}

.axis {
    font-size: 12px;
    fill: #334155;
}

.empty {
    color: #64748b;
    font-size: 0.9rem;
}

.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    list-style: none;
    padding: 0;
    margin: 0.4rem 0 0;
    font-size: 0.8rem;
}

.swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
    margin-right: 0.35rem;
    vertical-align: -1px;
}
</style>