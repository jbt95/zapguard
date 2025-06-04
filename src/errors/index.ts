import { ConcurrencyConflictError } from './concurrency-conflict'
import { ItemAlreadyExistsError } from './item-already-exists'
import { StorageOperationError } from './storage-operation-error'

export const Errors = {
  ConcurrencyConflictError,
  ItemAlreadyExistsError,
  StorageOperationError,
}
