import { CircuitBreaker } from '@/circuit-breaker'
import { Errors } from '@/errors'
import type {
  AsyncCircuitBreakerStorage,
  CircuitBreakerHooks,
  CircuitBreakerOptions,
  CircuitBreakerState,
} from '@/types'

/**
 * A circuit breaker with remote persistence using an async storage adapter.
 */
export class RemoteCircuitBreaker extends CircuitBreaker {
  /**
   * @param options Circuit breaker configuration options
   * @param storage Async storage adapter implementing getItem/setItem
   * @param name Required name for the circuit breaker instance (used as storage key)
   */
  constructor(
    options: CircuitBreakerOptions,
    private storage: AsyncCircuitBreakerStorage,
    name: string,
    hooks?: CircuitBreakerHooks,
  ) {
    if (!name) throw new Error('RemoteCircuitBreaker requires a non-empty name')
    super(options, name, hooks)
  }

  /**
   * Persist the current state to storage using optimistic concurrency control.
   * @throws StorageOperationError if storage fails
   * @throws ConcurrencyConflictError if version conflict detected
   */
  public async save(): Promise<void> {
    try {
      await this.storage.put(this.name!, this.state)
    } catch (err) {
      if (err instanceof Errors.ConcurrencyConflictError) throw err
      throw new Errors.StorageOperationError('Failed to save circuit breaker state', err)
    }
  }

  /**
   * Persist the current state only if the name does not already exist in storage.
   * @throws ItemAlreadyExistsError if the key exists
   * @throws StorageOperationError if storage fails
   */
  public async safeSave(): Promise<void> {
    try {
      const existing = await this.storage.get(this.name!)
      if (existing !== undefined) {
        throw new Errors.ItemAlreadyExistsError(this.name!)
      }
      await this.save()
    } catch (err) {
      if (err instanceof Errors.ItemAlreadyExistsError) throw err
      throw new Errors.StorageOperationError('Failed to safeSave circuit breaker state', err)
    }
  }

  /**
   * Load and validate state from storage, tracking version for concurrency control.
   * @throws StorageOperationError if storage or validation fails
   */
  public async load(): Promise<CircuitBreakerState | undefined> {
    try {
      const raw = await this.storage.get(this.name!)
      if (!raw) return undefined
      return raw.value
    } catch (err) {
      throw new Errors.StorageOperationError('Failed to load circuit breaker state', err)
    }
  }
}
