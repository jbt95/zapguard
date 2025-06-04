import { RemoteCircuitBreaker } from '@/remote-circuit-breaker'
import type {
  AsyncCircuitBreakerStorage,
  CircuitBreakerOptions,
  CircuitBreakerState,
  VersionedStorageValue,
} from '@/types'
import { beforeEach, describe, expect, it } from 'vitest'
import { Errors } from './errors'

class MockStorage implements AsyncCircuitBreakerStorage {
  private store = new Map<string, VersionedStorageValue>()
  async put(key: string, value: CircuitBreakerState, version?: string): Promise<string> {
    const current = this.store.get(key)
    // If version is provided, check for concurrency conflict
    if (version !== undefined && current && current.version !== version) {
      throw new Errors.ConcurrencyConflictError('Version conflict detected')
    }
    // Generate a new version (simple counter or timestamp for test)
    const newVersion = (Date.now() + Math.random()).toString(36)
    this.store.set(key, { value, version: newVersion })
    return newVersion
  }
  async get(key: string): Promise<VersionedStorageValue | undefined> {
    const entry = this.store.get(key)
    if (!entry) return undefined
    return { value: entry.value, version: entry.version }
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
}

describe('RemoteCircuitBreaker', () => {
  const options: CircuitBreakerOptions = {
    failureThreshold: 2,
    successThreshold: 2,
    resetTimeoutMs: 1000,
  }
  let storage: MockStorage
  let breaker: RemoteCircuitBreaker
  const name = 'test-cb'

  beforeEach(() => {
    storage = new MockStorage()
    breaker = new RemoteCircuitBreaker(options, storage, name)
  })

  it('should save state to storage', async () => {
    await breaker.save()
    const stored = await storage.get(name)
    expect(stored).toBeDefined()
    const state = stored?.value
    expect(state?.status).toBe('CLOSED')
  })

  it('should throw if safeSave called with existing key', async () => {
    await breaker.save()
    await expect(breaker.safeSave()).rejects.toThrow(Errors.ItemAlreadyExistsError)
  })

  it('should throw StorageOperationError on storage failure', async () => {
    const badStorage: AsyncCircuitBreakerStorage = {
      async put() {
        throw new Error('fail')
      },
      async get() {
        throw new Error('fail')
      },
      async delete() {
        throw new Error('fail')
      },
    }
    const badBreaker = new RemoteCircuitBreaker(options, badStorage, name)
    await expect(badBreaker.save()).rejects.toThrow(Errors.StorageOperationError)
    await expect(badBreaker.safeSave()).rejects.toThrow(Errors.StorageOperationError)
  })

  it('should validate loaded state', async () => {
    await storage.put(name, { status: 'CLOSED', failureCount: 0, successCount: 0 })
    const loaded = await breaker.load()
    expect(loaded).toBeDefined()
    expect(loaded?.status).toBe('CLOSED')
  })
})
