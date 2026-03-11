import { IUserView } from '@shared/domain/contracts/user-view.contract';

/**
 * IUserFacade — typed contract for cross-BC communication with User BC.
 *
 * Replaces the untyped `IUserFacade` that lived inside mediator.service.ts.
 * Now in shared/domain so both Auth BC and MediatorService can reference it
 * without importing User BC internals.
 *
 * Commands that accept `transactionContext` enable atomic cross-BC writes
 * via the Unit of Work pattern (see IUnitOfWork). When omitted, the command
 * is dispatched through the User BC command bus as usual.
 */
export interface IUserFacade {
  // === Queries ===
  findById(id: number): Promise<IUserView | null>;
  findByUUID(uuid: string): Promise<IUserView | null>;
  findByEmail(email: string): Promise<IUserView | null>;
  findByEmailOrUsername(identifier: string): Promise<IUserView | null>;
  existsByEmail(email: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
  findUserBySocialProvider(provider: string, providerId: string): Promise<IUserView | null>;

  // === Commands (dispatched through User BC command bus) ===
  createUser(
    email: string,
    username: string,
    passwordHash: string,
    transactionContext?: unknown,
  ): Promise<IUserView>;
  createUserFromSocial(
    email: string,
    username: string,
    provider: string,
    providerId: string,
  ): Promise<IUserView>;
  linkProviderToUser(userId: number, provider: string, providerId: string): Promise<void>;
  setPasswordForSocialUser(userId: number, passwordHash: string): Promise<void>;

  // === Cross-BC mutations (used inside UoW transactions) ===
  verifyUserEmail(uuid: string, transactionContext?: unknown): Promise<void>;
}
