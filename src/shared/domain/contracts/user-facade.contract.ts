import { IPersistedUserView } from '@shared/domain/contracts/user-view.contract';

/**
 * IUserFacade — typed contract for cross-BC communication with User BC.
 *
 * Replaces the untyped `IUserFacade` that lived inside mediator.service.ts.
 * Now in shared/domain so both Auth BC and MediatorService can reference it
 * without importing User BC internals.
 *
 * When called within an active UoW transaction, cross-BC writes automatically
 * join the transaction via the shared AsyncLocalStorage-backed UoW singleton.
 * No transaction context parameter needed — repos detect it internally.
 */
export interface IUserFacade {
  // === Queries ===
  findById(id: number): Promise<IPersistedUserView | null>;
  findByUUID(uuid: string): Promise<IPersistedUserView | null>;
  findByEmail(email: string): Promise<IPersistedUserView | null>;
  findByEmailOrUsername(identifier: string): Promise<IPersistedUserView | null>;
  existsByUsername(username: string): Promise<boolean>;
  findUserBySocialProvider(
    provider: string,
    providerId: string,
  ): Promise<IPersistedUserView | null>;

  // === Commands ===
  createUser(email: string, username: string, passwordHash: string): Promise<IPersistedUserView>;
  createUserFromSocial(
    email: string,
    username: string,
    provider: string,
    providerId: string,
  ): Promise<IPersistedUserView>;
  linkProviderToUser(userId: number, provider: string, providerId: string): Promise<void>;
}
