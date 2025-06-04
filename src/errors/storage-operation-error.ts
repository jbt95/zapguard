/**
 * Error thrown when storage operations fail.
 */
export class StorageOperationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'StorageOperationError'
  }
}
