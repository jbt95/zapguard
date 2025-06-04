import type { CircuitBreakerHooks, CircuitBreakerOptions, CircuitBreakerState } from '@/types'

/**
 * Implements the core logic for a stateless, in-memory circuit breaker.
 * All state transitions are immutable.
 */
export class CircuitBreaker {
  protected state: CircuitBreakerState = {
    status: 'CLOSED',
    failureCount: 0,
    successCount: 0,
  }
  protected readonly hooks?: CircuitBreakerHooks

  /**
   * @param options Circuit breaker configuration options
   * @param name Optional name for the circuit breaker instance
   * @param hooks Optional observability hooks
   */
  constructor(
    private readonly options: CircuitBreakerOptions,
    public readonly name?: string,
    hooks?: CircuitBreakerHooks,
  ) {
    this.hooks = hooks
  }

  /**
   * Replace the current state with a new state object (immutable update).
   * @param next The new state to set
   */
  private setState(next: CircuitBreakerState): void {
    const prev = this.state
    this.state = { ...next }
    this.hooks?.onStateChange?.(prev, this.state, { name: this.name })
  }

  /**
   * Returns a snapshot of the current state (immutable).
   * @returns A copy of the current state
   */
  public getState(): CircuitBreakerState {
    return { ...this.state }
  }

  /**
   * Throws if the circuit is open and not ready to retry.
   * Transitions to HALF_OPEN if timeout has elapsed.
   * @throws Error if the circuit is open and not ready
   */
  public assertCanExecute(): void {
    try {
      if (this.isOpen()) {
        if (
          this.state.openedAt &&
          Date.now() - this.state.openedAt >= this.options.resetTimeoutMs
        ) {
          this.setState({
            ...this.state,
            status: 'HALF_OPEN',
            successCount: 0,
            failureCount: 0,
          })
          return
        }
        throw new Error('Circuit breaker is open')
      }
    } catch (err) {
      this.hooks?.onError?.(err, { name: this.name, operation: 'assertCanExecute' })
      throw err
    }
  }

  /**
   * Records a successful execution.
   * Transitions to CLOSED if enough successes in HALF_OPEN.
   */
  public recordSuccess(): void {
    try {
      if (this.isHalfOpen()) {
        const successCount = this.state.successCount + 1
        if (successCount >= this.options.successThreshold) {
          this.setState({
            status: 'CLOSED',
            failureCount: 0,
            successCount: 0,
            openedAt: undefined,
          })
          return
        }
        this.setState({ ...this.state, successCount })
      }
    } catch (err) {
      this.hooks?.onError?.(err, { name: this.name, operation: 'recordSuccess' })
      throw err
    }
  }

  /**
   * Records a failed execution.
   * Transitions to OPEN if enough failures in CLOSED or HALF_OPEN.
   */
  public recordFailure(): void {
    try {
      if (this.isClosed() || this.isHalfOpen()) {
        const failureCount = this.state.failureCount + 1
        if (failureCount >= this.options.failureThreshold) {
          this.setState({
            status: 'OPEN',
            failureCount: 0,
            successCount: 0,
            openedAt: Date.now(),
          })
          return
        }
        this.setState({ ...this.state, failureCount })
      }
    } catch (err) {
      this.hooks?.onError?.(err, { name: this.name, operation: 'recordFailure' })
      throw err
    }
  }

  /**
   * Returns true if the circuit is OPEN.
   */
  public isOpen(): boolean {
    return this.state.status === 'OPEN'
  }

  /**
   * Returns true if the circuit is CLOSED.
   */
  public isClosed(): boolean {
    return this.state.status === 'CLOSED'
  }

  /**
   * Returns true if the circuit is HALF_OPEN.
   */
  public isHalfOpen(): boolean {
    return this.state.status === 'HALF_OPEN'
  }
}
