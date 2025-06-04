import { CircuitBreaker } from '@/circuit-breaker'
import type { CircuitBreakerOptions, CircuitBreakerState } from '@/types'
import { beforeEach, describe, expect, it } from 'vitest'

describe('InMemoryCircuitBreaker', () => {
  const options: CircuitBreakerOptions = {
    failureThreshold: 2,
    successThreshold: 2,
    resetTimeoutMs: 1000,
  }
  let breaker: CircuitBreaker

  beforeEach(() => {
    breaker = new CircuitBreaker(options)
  })

  it('should start in CLOSED state', () => {
    expect(breaker['isClosed']()).toBe(true)
    expect(breaker['isOpen']()).toBe(false)
    expect(breaker['isHalfOpen']()).toBe(false)
  })

  it('should transition to OPEN after enough failures', () => {
    breaker.recordFailure()
    breaker.recordFailure()
    expect(breaker['isOpen']()).toBe(true)
  })

  it('should throw when executing while OPEN and not timed out', () => {
    breaker.recordFailure()
    breaker.recordFailure()
    expect(() => breaker.assertCanExecute()).toThrow('Circuit breaker is open')
  })

  it('should transition to HALF_OPEN after timeout', () => {
    breaker.recordFailure()
    breaker.recordFailure()
    // Simulate time passing by directly updating the private state using a type cast
    // Use a type assertion to access the private state in a type-safe way
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakerWithState = breaker as unknown as { state: { openedAt?: number } }
    if (breakerWithState.state.openedAt !== undefined) {
      breakerWithState.state.openedAt = Date.now() - options.resetTimeoutMs - 1
    }
    expect(() => breaker.assertCanExecute()).not.toThrow()
    expect(breaker['isHalfOpen']()).toBe(true)
  })

  it('should transition to CLOSED after enough successes in HALF_OPEN', () => {
    breaker.recordFailure()
    breaker.recordFailure()
    // Simulate time passing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakerWithState = breaker as unknown as { state: { openedAt?: number } }
    if (breakerWithState.state.openedAt !== undefined) {
      breakerWithState.state.openedAt = Date.now() - options.resetTimeoutMs - 1
    }
    breaker.assertCanExecute() // now HALF_OPEN
    breaker.recordSuccess()
    breaker.recordSuccess()
    expect(breaker['isClosed']()).toBe(true)
  })

  it('should stay in HALF_OPEN if not enough successes', () => {
    breaker.recordFailure()
    breaker.recordFailure()
    // Simulate time passing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakerWithState = breaker as unknown as { state: { openedAt?: number } }
    if (breakerWithState.state.openedAt !== undefined) {
      breakerWithState.state.openedAt = Date.now() - options.resetTimeoutMs - 1
    }
    breaker.assertCanExecute() // now HALF_OPEN
    breaker.recordSuccess()
    expect(breaker['isHalfOpen']()).toBe(true)
  })
})

describe('InMemoryCircuitBreaker - hooks', () => {
  let breaker: CircuitBreaker
  let stateChanges: Array<{ prev: CircuitBreakerState; next: CircuitBreakerState }>
  let errors: Array<{ error: unknown; operation: string }>

  beforeEach(() => {
    stateChanges = []
    errors = []
    breaker = new CircuitBreaker(
      {
        failureThreshold: 1,
        successThreshold: 1,
        resetTimeoutMs: 1000,
      },
      'test',
      {
        onStateChange: (prev, next) => stateChanges.push({ prev, next }),
        onError: (error, meta) => errors.push({ error, operation: meta.operation }),
      },
    )
  })

  it('should call onStateChange hook on state transition', () => {
    breaker.recordFailure()
    expect(stateChanges.length).toBe(1)
    expect(stateChanges[0]?.prev.status).toBe('CLOSED')
    expect(stateChanges[0]?.next.status).toBe('OPEN')
  })

  it('should call onError hook on error', () => {
    breaker.recordFailure() // open
    expect(() => breaker.assertCanExecute()).toThrow()
    expect(errors.length).toBe(1)
    expect(errors[0]?.operation).toBe('assertCanExecute')
  })
})
