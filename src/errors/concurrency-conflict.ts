/**
 * Error thrown when a concurrency conflict occurs.
 */
export class ConcurrencyConflictError extends Error {
  constructor(key: string) {
    super(`Concurrency conflict for key "${key}"`)
    this.name = 'ConcurrencyConflictError'
  }
}
