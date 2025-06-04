# cf-circuit-breaker

A production-grade, DDD-inspired, hexagonal-architecture Circuit Breaker for Cloudflare Workers (TypeScript).

## Features

- Stateless and stateful circuit breaker implementations
- **Uses the [Storage web standard](https://developer.mozilla.org/en-US/docs/Web/API/Storage) for persistence**—compatible with Cloudflare KV, R2, or any custom adapter implementing the Storage interface
- Immutability: all state transitions return new state objects, never mutate in place
- Thoroughly tested with Vitest
- Designed for Cloudflare Workers, but portable to other platforms

## Installation

```sh
pnpm install
```

## Usage

### Basic Circuit Breaker

```typescript
import { InMemoryCircuitBreaker } from '@/src/circuit-breaker'
import type { CircuitBreakerOptions } from '@/src/types'

const options: CircuitBreakerOptions = {
  failureThreshold: 3,
  successThreshold: 2,
  resetTimeoutMs: 5000,
}
const breaker = new InMemoryCircuitBreaker(options)

try {
  breaker.assertCanExecute()
  // ...call your protected resource...
  breaker.recordSuccess()
} catch (err) {
  breaker.recordFailure()
}
```

### Stateful Circuit Breaker (with pluggable storage)

```typescript
import { RemoteCircuitBreaker } from '@/src/stateful-circuit-breaker'
import type { CircuitBreakerOptions } from '@/src/types'

// Example storage adapter (must implement setItem/get)
const storage = {
  async setItem(key: string, value: string) {
    // e.g., await env.MY_KV.put(key, value)
  },
  get(key: string) {
    // e.g., return await env.MY_KV.get(key)
    return undefined
  },
}

const options: CircuitBreakerOptions = {
  failureThreshold: 3,
  successThreshold: 2,
  resetTimeoutMs: 5000,
}
const breaker = new RemoteCircuitBreaker(options, storage)

await breaker.save('my-key')
// or
breaker.deferSave('my-key')
```

## Decorator Usage

### Function Decorator

You can use the provided `withCircuitBreaker` function to automatically apply circuit breaker logic to any async function:

```typescript
import { CircuitBreaker } from '@/src/circuit-breaker'
import { withCircuitBreaker } from '@/src/decorator'

const breaker = new CircuitBreaker({
  failureThreshold: 3,
  successThreshold: 2,
  resetTimeoutMs: 5000,
})

async function fetchData(url: string): Promise<Response> {
  return fetch(url)
}

const protectedFetch = withCircuitBreaker(breaker, fetchData)

try {
  const res = await protectedFetch('https://example.com')
  // ...
} catch (err) {
  // handle circuit open or fetch error
}
```

### Class Method Decorator

With TypeScript's `experimentalDecorators` enabled, you can use the `@CircuitBreakerGuard` decorator to protect class methods:

```typescript
import { CircuitBreaker } from '@/src/circuit-breaker'
import { CircuitBreakerGuard } from '@/src/decorator'

class MyService {
  private breaker = new CircuitBreaker({
    failureThreshold: 3,
    successThreshold: 2,
    resetTimeoutMs: 5000,
  })

  @CircuitBreakerGuard('breaker')
  async fetchData(url: string): Promise<Response> {
    return fetch(url)
  }
}

const service = new MyService()

try {
  const res = await service.fetchData('https://example.com')
  // ...
} catch (err) {
  // handle circuit open or fetch error
}
```

This ensures that all calls to `fetchData` are guarded by the circuit breaker, and state transitions are handled automatically.

## Immutability & State Management

- All state transitions in the circuit breaker are immutable: the internal state is never mutated in place, but always replaced with a new object.
- This ensures thread safety and makes the logic easier to reason about, especially in distributed or async environments like Cloudflare Workers.
- You can snapshot the current state at any time using the `getState()` method.

## Testing

Run all tests:

```sh
pnpm test
```

## Project Structure

- `src/types.ts` – Shared types and interfaces
- `src/circuit-breaker.ts` – In-memory circuit breaker (domain logic)
- `src/stateful-circuit-breaker.ts` – Remote circuit breaker with pluggable storage
- `src/decorator.ts` – Decorator for applying circuit breaker to functions
- `src/*.test.ts` – Vitest unit tests

## Design Principles

- **Domain logic is framework-agnostic**: No Cloudflare-specific code in the core logic
- **Hexagonal architecture**: Ports (interfaces) and adapters (storage, persistence)
- **Immutability**: All state transitions are pure and replace the state object
- **Testable and maintainable**: All logic is covered by unit tests

## Cloudflare Workers Integration

- Use with KV, R2, or Durable Objects for persistence
- Designed for low-latency, stateless operation
- All configuration via dependency injection (no globals)
- Example adapters for Cloudflare storage are easy to implement

## License

MIT
