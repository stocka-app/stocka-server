import { IUserView } from '@shared/domain/contracts/user-view.contract';

/**
 * IUserFacade — typed contract for cross-BC communication with User BC.
 *
 * Replaces the untyped `IUserFacade` that lived inside mediator.service.ts.
 * Now in shared/domain so both Auth BC and MediatorService can reference it
 * without importing User BC internals.
 *
 * IMPORTANT: This interface only exposes queries and commands.
 * Cross-BC mutations (verifyUserEmail, blockUserVerification, updatePasswordHash)
 * are handled via domain events — see shared/domain/events/integration/.
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
  createUser(email: string, username: string, passwordHash: string): Promise<IUserView>;
  createUserFromSocial(
    email: string,
    username: string,
    provider: string,
    providerId: string,
  ): Promise<IUserView>;
  linkProviderToUser(userId: number, provider: string, providerId: string): Promise<void>;
  setPasswordForSocialUser(userId: number, passwordHash: string): Promise<void>;
}
