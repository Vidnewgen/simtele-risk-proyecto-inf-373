import { describe, expect, it } from 'vitest'
import { LocalHistoryRepository, type StorageAdapter } from './local-history'

class MemoryStorage implements StorageAdapter {
  private values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

describe('historial local', () => {
  it('guarda y recupera una simulación después de recrear el repositorio', () => {
    const storage = new MemoryStorage()
    const first = new LocalHistoryRepository(storage)
    first.save({ moduleId: 2, scenario: 'NORMAL', summary: 'Jacobi convergió' })

    const recovered = new LocalHistoryRepository(storage).list()
    expect(recovered).toHaveLength(1)
    expect(recovered[0].moduleId).toBe(2)
    expect(recovered[0].scenario).toBe('NORMAL')
  })

  it('limpia el historial', () => {
    const storage = new MemoryStorage()
    const repository = new LocalHistoryRepository(storage)
    repository.save({ moduleId: 2, scenario: 'ESTRES', summary: 'Prueba' })
    repository.clear()
    expect(repository.list()).toEqual([])
  })
})
