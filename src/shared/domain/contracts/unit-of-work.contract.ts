/**
 * IUnitOfWork — transaction boundary contract.
 *
 * Defines the interface for managing database transactions.
 * The implementation (TypeOrmUnitOfWork) lives in infrastructure;
 * this contract has zero infrastructure imports.
 *
 * Usage in handlers (preferred):
 *   const result = await uow.execute(async () => {
 *     // ... repository operations automatically join the active transaction ...
 *     return result;
 *   });
 *
 * Repositories call isActive() and getManager() internally — handlers
 * only know execute() (or begin/commit/rollback for advanced use).
 */
export interface IUnitOfWork {
  /**
   * Executes the given callback inside a transaction.
   * Automatically commits on success and rolls back on error.
   * Preferred over manual begin/commit/rollback in handlers.
   */
  execute<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * Starts a new database transaction.
   * Must be called before performing any transactional operations.
   */
  begin(): Promise<void>;

  /**
   * Commits the current transaction.
   * All changes made since begin() become permanent.
   */
  commit(): Promise<void>;

  /**
   * Rolls back the current transaction.
   * All changes made since begin() are discarded.
   */
  rollback(): Promise<void>;

  /**
   * Returns true if a transaction is currently active in this async context.
   * Repositories use this to decide whether to join the transaction or use
   * their default connection.
   */
  isActive(): boolean;

  /**
   * Returns the underlying transaction-scoped manager.
   * Only repositories in the infrastructure layer should call this.
   * The return type is `unknown` to avoid leaking infrastructure types into the domain.
   */
  getManager(): unknown;

  /**
   * Runs the given callback inside an isolated async context.
   * Any transaction started within the callback (via begin/commit/rollback)
   * is scoped exclusively to that context and cannot leak to parent or
   * sibling async continuations (e.g. other HTTP requests on the same socket).
   */
  runIsolated(fn: () => void): void;
}
