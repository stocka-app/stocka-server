/**
 * IUnitOfWork — transaction boundary contract.
 *
 * Defines the interface for managing database transactions.
 * The implementation (TypeOrmUnitOfWork) lives in infrastructure;
 * this contract has zero infrastructure imports.
 *
 * Usage in handlers:
 *   await uow.begin();
 *   try {
 *     // ... repository operations automatically join the active transaction ...
 *     await uow.commit();
 *   } catch (error) {
 *     await uow.rollback();
 *     throw error;
 *   }
 *
 * Repositories call isActive() and getManager() internally — handlers
 * only know begin(), commit(), and rollback().
 */
export interface IUnitOfWork {
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
}
