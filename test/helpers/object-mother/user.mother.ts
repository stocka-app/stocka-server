import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

/**
 * UserMother — test object factory for UserAggregate (pure anchor).
 *
 * In the new architecture, UserAggregate carries only: id, uuid, createdAt, updatedAt, archivedAt.
 * All credential/profile data lives in CredentialAccountModel and PersonalProfileModel.
 *
 * Use CredentialAccountMother for credential-related test data.
 */
export class UserMother {
  static create(
    overrides: Partial<{
      id: number;
      uuid: string;
      createdAt: Date;
      updatedAt: Date;
      archivedAt: Date | null;
    }> = {},
  ): UserAggregate {
    return UserAggregate.reconstitute({
      id: overrides.id ?? 1,
      uuid: overrides.uuid ?? '550e8400-e29b-41d4-a716-446655440000',
      createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
      updatedAt: overrides.updatedAt ?? new Date('2024-01-01T00:00:00Z'),
      archivedAt: overrides.archivedAt ?? null,
    });
  }

  static createArchived(
    overrides: Partial<{
      id: number;
      uuid: string;
      createdAt: Date;
      updatedAt: Date;
      archivedAt: Date;
    }> = {},
  ): UserAggregate {
    return this.create({
      ...overrides,
      archivedAt: overrides.archivedAt ?? new Date('2024-06-01T00:00:00Z'),
    });
  }
}

/**
 * CredentialAccountMother — test object factory for CredentialAccountModel.
 */
export class CredentialAccountMother {
  static create(
    overrides: Partial<{
      id: number;
      uuid: string;
      accountId: number;
      email: string;
      passwordHash: string | null;
      status: string;
      emailVerifiedAt: Date | null;
      verificationBlockedUntil: Date | null;
      createdWith: string;
      createdAt: Date;
      updatedAt: Date;
      archivedAt: Date | null;
    }> = {},
  ): CredentialAccountModel {
    return CredentialAccountModel.reconstitute({
      id: overrides.id ?? 1,
      uuid: overrides.uuid ?? '660f9511-f30c-4ae5-b827-557766551111',
      accountId: overrides.accountId ?? 1,
      email: overrides.email ?? 'test@example.com',
      passwordHash: overrides.passwordHash !== undefined
        ? overrides.passwordHash
        : '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.z9OYHvJpzZ9y7u',
      status: overrides.status ?? 'active',
      emailVerifiedAt: overrides.emailVerifiedAt !== undefined ? overrides.emailVerifiedAt : null,
      verificationBlockedUntil: overrides.verificationBlockedUntil ?? null,
      createdWith: overrides.createdWith ?? 'email',
      createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
      updatedAt: overrides.updatedAt ?? new Date('2024-01-01T00:00:00Z'),
      archivedAt: overrides.archivedAt ?? null,
    });
  }

  static createPendingVerification(
    overrides: Partial<{
      id: number;
      uuid: string;
      accountId: number;
      email: string;
      passwordHash: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ): CredentialAccountModel {
    return this.create({
      ...overrides,
      status: 'pending_verification',
      emailVerifiedAt: null,
    });
  }

  static createVerified(
    overrides: Partial<{
      id: number;
      uuid: string;
      accountId: number;
      email: string;
      passwordHash: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ): CredentialAccountModel {
    return this.create({
      ...overrides,
      status: 'active',
      emailVerifiedAt: new Date('2024-01-02T00:00:00Z'),
    });
  }

  static createSocialOnly(
    overrides: Partial<{
      id: number;
      uuid: string;
      accountId: number;
      email: string;
      provider: string;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ): CredentialAccountModel {
    const provider = overrides.provider ?? 'google';
    return this.create({
      ...overrides,
      passwordHash: null,
      status: 'email_verified_by_provider',
      emailVerifiedAt: new Date('2024-01-01T00:00:00Z'),
      createdWith: provider,
    });
  }

  static createBlocked(
    overrides: Partial<{
      id: number;
      uuid: string;
      accountId: number;
      email: string;
      verificationBlockedUntil: Date;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ): CredentialAccountModel {
    return this.create({
      ...overrides,
      status: 'pending_verification',
      verificationBlockedUntil: overrides.verificationBlockedUntil ?? new Date(Date.now() + 5 * 60 * 1000),
    });
  }

  static createWithEmail(email: string): CredentialAccountModel {
    return this.create({ email });
  }
}
