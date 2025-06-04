import type { CircuitBreaker } from '@/circuit-breaker'

/**
 * Decorator to wrap an async function with circuit breaker logic.
 * Calls assertCanExecute before execution, records success/failure after.
 *
 * @template Args - Argument types of the wrapped function
 * @template R - Return type of the wrapped function
 * @param breaker The CircuitBreaker instance
 * @param fn The async function to wrap
 * @returns A function that applies circuit breaker logic to the original function
 */
export function withCircuitBreaker<Args extends unknown[], R>(
  breaker: CircuitBreaker,
  fn: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<R> {
  return async (...args: Args): Promise<R> => {
    breaker.assertCanExecute()
    try {
      const result = await fn(...args)
      breaker.recordSuccess()
      return result
    } catch (err) {
      breaker.recordFailure()
      throw err
    }
  }
}

/**
 * Class method decorator for circuit breaker protection.
 *
 * Usage (with experimentalDecorators enabled in tsconfig):
 *
 *   class MyService {
 *     constructor(private breaker: CircuitBreaker) {}
 *
 *     @CircuitBreakerGuard('breaker')
 *     async fetchData(url: string) { ... }
 *   }
 *
 * The decorator will call assertCanExecute, recordSuccess, and recordFailure automatically.
 *
 * @param breakerProperty The property name on the class instance holding the CircuitBreaker
 * @returns A method decorator that applies circuit breaker logic
 */
export function CircuitBreakerGuard(breakerProperty: string) {
  return function (
    _target: unknown,
    _propertyKey: string | symbol,
    descriptor?: TypedPropertyDescriptor<(...args: unknown[]) => Promise<unknown>>,
  ): void {
    if (!descriptor) return
    const originalMethod = descriptor.value
    if (!originalMethod) return
    descriptor.value = async function (this: Record<string, unknown>, ...args: unknown[]) {
      const breaker = this[breakerProperty] as CircuitBreaker
      breaker.assertCanExecute()
      try {
        const result = await originalMethod.apply(this, args)
        breaker.recordSuccess()
        return result
      } catch (err) {
        breaker.recordFailure()
        throw err
      }
    }
  }
}
