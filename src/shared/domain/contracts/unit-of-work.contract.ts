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
 *     // ... multiple repository operations using uow.getManager() internally ...
 *     await uow.commit();
 *   } catch (error) {
 *     await uow.rollback();
 *     throw error;
 *   }
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
   * Returns the underlying transaction-scoped manager.
   * Repositories call this internally — the manager type is opaque at the domain level.
   * The return type is `unknown` to avoid leaking infrastructure types into the domain.
   */
  getManager(): unknown;
}
