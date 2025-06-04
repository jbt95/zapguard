/**
 * Represents the configuration options for a CircuitBreaker.
 */
export interface CircuitBreakerOptions {
  readonly failureThreshold: number
  readonly successThreshold: number
  readonly resetTimeoutMs: number
}

/**
 * Represents the state of a CircuitBreaker.
 */
export interface CircuitBreakerState {
  readonly status: CircuitBreakerStatus
  readonly failureCount: number
  readonly successCount: number
  readonly openedAt?: number
}

/**
 * Enum for the possible statuses of a CircuitBreaker.
 */
export type CircuitBreakerStatus = 'OPEN' | 'CLOSED' | 'HALF_OPEN'

/**
 * Async storage port for remote circuit breaker state with versioning for concurrency control.
 */
export interface VersionedStorageValue {
  value: CircuitBreakerState
  version: string
}

export interface AsyncCircuitBreakerStorage {
  put(key: string, value: CircuitBreakerState): Promise<string>
  get(key: string): Promise<VersionedStorageValue | undefined>
  delete(key: string): Promise<void>
}

/**
 * Observability hooks for circuit breaker events.
 */
export interface CircuitBreakerHooks {
  onStateChange?: (
    prev: CircuitBreakerState,
    next: CircuitBreakerState,
    meta: { name?: string },
  ) => void
  onError?: (error: unknown, meta: { name?: string; operation: string }) => void
}
