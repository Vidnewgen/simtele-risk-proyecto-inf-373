const BASE = '/api'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
            ...(init.headers ?? {}),
        },
    })
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
    return res.status === 204 ? (undefined as T) : res.json()
}

export const db = {
    select: <T>(tabla: string, query = '') =>
        request<T[]>(`/${tabla}${query ? '?' + query : ''}`),

    insert: <T>(tabla: string, body: object | object[]) =>
        request<T[]>(`/${tabla}`, { method: 'POST', body: JSON.stringify(body) }),

    update: <T>(tabla: string, filtro: string, body: object) =>
        request<T[]>(`/${tabla}?${filtro}`, { method: 'PATCH', body: JSON.stringify(body) }),

    remove: (tabla: string, filtro: string) =>
        request<void>(`/${tabla}?${filtro}`, {
            method: 'DELETE',
            headers: { Prefer: 'return=minimal' },
        }),
}