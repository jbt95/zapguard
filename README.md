# Zapguard

A production-grade for Node.js and Cloudflare Workers.

## Features

- Stateless and stateful circuit breaker implementations
- **Pluggable async storage**: compatible with Cloudflare KV, R2, Durable Objects, or any custom adapter implementing the async storage interface
- Immutability: all state transitions return new state objects, never mutate in place
- Optimistic concurrency control for distributed state
- Observability hooks for state changes and errors
- Thoroughly tested with Vitest
- Designed for Cloudflare Workers, but portable to other platforms

## Installation

```sh
pnpm install zapguard
```

## Usage

### In-Memory Circuit Breaker

```typescript
import { CircuitBreaker, CircuitBreakerOptions } from 'zapguard'

const options: CircuitBreakerOptions = {
  failureThreshold: 3,
  successThreshold: 2,
  resetTimeoutMs: 5000,
}
const breaker = new CircuitBreaker(options)

try {
  breaker.assertCanExecute()
  // ...call your protected resource...
  breaker.recordSuccess()
} catch (err) {
  breaker.recordFailure()
}
```

### Remote Circuit Breaker (with pluggable async storage)

```typescript
import { RemoteCircuitBreaker, CloudflareKVStorage, CircuitBreakerOptions, AsyncCircuitBreakerStorage } from 'zapguard'

// env.MY_KV must be a bound KVNamespace
const storage: AsyncCircuitBreakerStorage = new CloudflareKVStorage(env.MY_KV)

const options: CircuitBreakerOptions = {
  failureThreshold: 3,
  successThreshold: 2,
  resetTimeoutMs: 5000,
}
const breaker = new RemoteCircuitBreaker(options, storage, 'my-circuit')

// Save state (with optimistic concurrency)
await breaker.save()

// Load state
const state = await breaker.load()

// Use as you would the in-memory version
breaker.assertCanExecute()
// ...
breaker.recordSuccess()
```

## Decorator Usage

### Function Decorator

You can use the provided `withCircuitBreaker` function to automatically apply circuit breaker logic to any async function:

```typescript
import { CircuitBreaker, withCircuitBreaker } from 'zapguard'

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
import { CircuitBreaker, CircuitBreakerGuard } from 'zapguard'

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
- `src/remote-circuit-breaker.ts` – Remote circuit breaker with pluggable async storage
- `src/adapters/cloudflare-kv-storage.ts` – Cloudflare KV adapter
- `src/decorator.ts` – Decorator for applying circuit breaker to functions
- `src/*.test.ts` – Vitest unit tests

## Cloudflare Workers Integration

- Use with KV, R2, or Durable Objects for persistence
- Designed for low-latency, stateless operation
- All configuration via dependency injection (no globals)
- Example adapters for Cloudflare storage are provided

## Advanced Usage & Troubleshooting

- **Optimistic concurrency**: The remote circuit breaker uses versioning to prevent lost updates in distributed environments. If a version conflict occurs, retry the operation.
- **Observability hooks**: Pass `onStateChange` and `onError` hooks to log or monitor state transitions and errors.
- **Custom adapters**: Implement the `AsyncCircuitBreakerStorage` interface for any async storage backend.
- **Error handling**: All storage operations throw typed errors for robust error handling.

## License

MIT
