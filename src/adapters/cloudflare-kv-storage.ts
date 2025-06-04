import { KVNamespace } from '@cloudflare/workers-types'
import type {
  AsyncCircuitBreakerStorage,
  CircuitBreakerState,
  VersionedStorageValue,
} from '../types'

export class CloudflareKVStorage implements AsyncCircuitBreakerStorage {
  constructor(private kv: KVNamespace) {}

  async put(key: string, value: CircuitBreakerState): Promise<string> {
    const newVersion = new Date().toISOString()
    await this.kv.put(
      key,
      JSON.stringify({
        ...value,
        version: newVersion,
      }),
    )
    return newVersion
  }

  async get(key: string): Promise<VersionedStorageValue | undefined> {
    const value = await this.kv.get<VersionedStorageValue>(key, 'json')
    if (value === null || typeof value !== 'object' || value === null) {
      return undefined
    }
    return {
      ...value,
      version: typeof value.version === 'string' ? value.version : new Date().toISOString(),
    }
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key)
  }
}
