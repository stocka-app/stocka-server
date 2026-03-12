/**
 * IUserView — read-only view of a User for cross-BC consumption.
 *
 * Auth BC (and any other BC) uses this interface instead of importing
 * UserAggregate directly, preventing coupling to User BC domain internals.
 */
export interface IUserView {
  readonly id: number | undefined;
  readonly uuid: string;
  readonly email: string;
  readonly username: string;
  readonly passwordHash: string | null;
  readonly createdWith: string;
  readonly accountType: string;
  readonly emailVerifiedAt: Date | null;
  readonly verificationBlockedUntil: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt: Date | null;

  hasPassword(): boolean;
  isFlexiblePending(): boolean;
  isEmailVerified(): boolean;
  isArchived(): boolean;
  isPendingVerification(): boolean;
  requiresEmailVerification(): boolean;
}

/**
 * IPersistedUserView — a user that has been persisted to the database.
 *
 * Guarantees `id` is always a number (assigned by DB on insert).
 * All IUserFacade methods return this instead of IUserView because
 * every read and write goes through the DB.
 */
export interface IPersistedUserView extends IUserView {
  readonly id: number;
}
