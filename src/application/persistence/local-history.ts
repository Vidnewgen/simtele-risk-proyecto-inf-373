export interface HistoryEntry {
  id: string
  moduleId: number
  scenario: string
  createdAt: string
  summary: string
}

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export class LocalHistoryRepository {
  private readonly key = 'simtele-risk-history'

  constructor(private readonly storage: StorageAdapter) {}

  save(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): HistoryEntry {
    const complete: HistoryEntry = {
      ...entry,
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
    }
    const history = this.list()
    this.storage.setItem(this.key, JSON.stringify([complete, ...history].slice(0, 50)))
    return complete
  }

  list(): HistoryEntry[] {
    const value = this.storage.getItem(this.key)
    if (!value) return []
    try {
      return JSON.parse(value) as HistoryEntry[]
    } catch {
      return []
    }
  }

  clear(): void {
    this.storage.setItem(this.key, '[]')
  }
}

export function browserHistoryRepository(): LocalHistoryRepository {
  return new LocalHistoryRepository(localStorage)
}
