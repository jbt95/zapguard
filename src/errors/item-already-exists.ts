/**
 * Error thrown when attempting to save a state with a key that already exists.
 */
export class ItemAlreadyExistsError extends Error {
  constructor(key: string) {
    super(`Item with key "${key}" already exists.`)
    this.name = 'ItemAlreadyExistsError'
  }
}
