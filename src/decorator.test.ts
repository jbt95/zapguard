import { beforeEach, describe, expect, it } from 'vitest'
import { CircuitBreaker } from './circuit-breaker'
import { CircuitBreakerGuard, withCircuitBreaker } from './decorator'
import type { CircuitBreakerState } from './types'

describe('withCircuitBreaker', () => {
  let breaker: CircuitBreaker
  let calls: number

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 2,
      successThreshold: 2,
      resetTimeoutMs: 1000,
    })
    calls = 0
  })

  it('should call the wrapped function and record success', async () => {
    const fn = async () => {
      calls++
      return 'ok'
    }
    const wrapped = withCircuitBreaker(breaker, fn)
    const result = await wrapped()
    expect(result).toBe('ok')
    expect(calls).toBe(1)
    expect(breaker['isClosed']()).toBe(true)
  })

  it('should record failure if the wrapped function throws', async () => {
    const fn = async () => {
      calls++
      throw new Error('fail')
    }
    const wrapped = withCircuitBreaker(breaker, fn)
    await expect(wrapped()).rejects.toThrow('fail')
    expect(calls).toBe(1)
    expect(breaker['isClosed']()).toBe(true)
  })

  it('should open the circuit after enough failures', async () => {
    const fn = async () => {
      throw new Error('fail')
    }
    const wrapped = withCircuitBreaker(breaker, fn)
    await expect(wrapped()).rejects.toThrow('fail')
    await expect(wrapped()).rejects.toThrow('fail')
    expect(breaker['isOpen']()).toBe(true)
  })

  it('should throw if circuit is open', async () => {
    const fn = async () => {
      throw new Error('fail')
    }
    const wrapped = withCircuitBreaker(breaker, fn)
    await expect(wrapped()).rejects.toThrow('fail')
    await expect(wrapped()).rejects.toThrow('fail')
    await expect(wrapped()).rejects.toThrow('Circuit breaker is open')
  })
})

describe('withCircuitBreaker - hooks', () => {
  it('should call hooks on state change and error', async () => {
    const stateChanges: Array<{ prev: CircuitBreakerState; next: CircuitBreakerState }> = []
    const errors: Array<{ err: unknown; meta: { name?: string; operation: string } }> = []
    const breaker = new CircuitBreaker(
      { failureThreshold: 1, successThreshold: 1, resetTimeoutMs: 1000 },
      'decorator',
      {
        onStateChange: (prev, next) => stateChanges.push({ prev, next }),
        onError: (err, meta) => errors.push({ err, meta }),
      },
    )
    const fn = async () => {
      throw new Error('fail')
    }
    const wrapped = withCircuitBreaker(breaker, fn)
    await expect(wrapped()).rejects.toThrow('fail')
    expect(stateChanges.length).toBe(1)
    expect(errors.length).toBe(0)
    // Now circuit is open, next call triggers error hook
    await expect(wrapped()).rejects.toThrow('Circuit breaker is open')
    expect(errors.length).toBe(1)
    expect(errors[0]?.meta.operation).toBe('assertCanExecute')
  })
})

describe('CircuitBreakerGuard (class method decorator)', () => {
  let calls: number
  let breaker: CircuitBreaker
  let svc: { succeed: () => Promise<string>; fail: () => Promise<string> }

  beforeEach(() => {
    calls = 0
    breaker = new CircuitBreaker(
      {
        failureThreshold: 1,
        successThreshold: 1,
        resetTimeoutMs: 1000,
      },
      'svc',
    )
    // Dynamically define a class with a decorated method
    class Service {
      breaker = breaker
      async succeed(): Promise<string> {
        calls++
        return 'ok'
      }
      async fail(): Promise<string> {
        calls++
        throw new Error('fail')
      }
    }
    // Manually apply the decorator to the prototype
    const succeedDesc = Object.getOwnPropertyDescriptor(Service.prototype, 'succeed')!
    CircuitBreakerGuard('breaker')(Service.prototype, 'succeed', succeedDesc)
    Object.defineProperty(Service.prototype, 'succeed', succeedDesc)
    const failDesc = Object.getOwnPropertyDescriptor(Service.prototype, 'fail')!
    CircuitBreakerGuard('breaker')(Service.prototype, 'fail', failDesc)
    Object.defineProperty(Service.prototype, 'fail', failDesc)
    svc = new Service()
  })

  it('should call the decorated method and record success', async () => {
    const result = await svc.succeed()
    expect(result).toBe('ok')
    expect(calls).toBe(1)
    expect(breaker.isClosed()).toBe(true)
  })

  it('should record failure and open the circuit', async () => {
    await expect(svc.fail()).rejects.toThrow('fail')
    expect(breaker.isOpen()).toBe(true)
  })

  it('should throw if circuit is open', async () => {
    await expect(svc.fail()).rejects.toThrow('fail')
    await expect(svc.fail()).rejects.toThrow('Circuit breaker is open')
  })
})
