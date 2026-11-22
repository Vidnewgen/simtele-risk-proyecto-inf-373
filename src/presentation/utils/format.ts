const SUP: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
}

export function formatSci(n: number | null, digits = 2): string {
    if (n === null || !Number.isFinite(n)) return '—'
    if (n === 0) return '0'
    const [mantissa, exp] = n.toExponential(digits).split('e') as [string, string]
    const sup = String(Number(exp)).split('').map((c) => SUP[c] ?? c).join('')
    return `${mantissa} × 10${sup}`
}

export const formatPercent = (n: number | null): string =>
    n === null ? '—' : n === 0 ? '0 %' : `${formatSci(n)} %`

export const formatVector = (v: number[] | null): string =>
    v ? `[${v.map((x) => x.toFixed(6)).join(', ')}]ᵀ` : 'Divergente'