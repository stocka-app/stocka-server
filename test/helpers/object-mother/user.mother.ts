import { AccountType, UserAggregate } from '@user/domain/models/user.aggregate';

export class UserMother {
  static create(
    overrides: Partial<{
      id: number;
      uuid: string;
      email: string;
      username: string;
      passwordHash: string | null;
      status: string;
      emailVerifiedAt: Date | null;
      verificationBlockedUntil: Date | null;
      createdWith: string;
      accountType: string;
      createdAt: Date;
      updatedAt: Date;
      archivedAt: Date | null;
    }> = {},
  ): UserAggregate {
    const defaults = {
      id: 1,
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.z9OYHvJpzZ9y7u', // "Password1"
      status: 'active',
      emailVerifiedAt: null,
      verificationBlockedUntil: null,
      createdWith: 'email',
      accountType: AccountType.MANUAL,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      archivedAt: null,
    };

    const props = { ...defaults, ...overrides };

    return UserAggregate.reconstitute({
      id: props.id,
      uuid: props.uuid,
      email: props.email,
      username: props.username,
      passwordHash: props.passwordHash,
      status: props.status,
      emailVerifiedAt: props.emailVerifiedAt,
      verificationBlockedUntil: props.verificationBlockedUntil,
      createdWith: props.createdWith,
      accountType: props.accountType,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
  }

  static createArchived(
    overrides: Partial<{
      id: number;
      uuid: string;
      email: string;
      username: string;
      passwordHash: string | null;
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

  static createSocialOnly(
    overrides: Partial<{
      id: number;
      uuid: string;
      email: string;
      username: string;
      provider: string;
      createdAt: Date;
      updatedAt: Date;
      archivedAt: Date | null;
    }> = {},
  ): UserAggregate {
    const provider = overrides.provider ?? 'google';
    return this.create({
      ...overrides,
      passwordHash: null,
      status: 'email_verified_by_provider',
      createdWith: provider,
      accountType: AccountType.SOCIAL,
    });
  }

  static createFlexible(
    overrides: Partial<{
      id: number;
      uuid: string;
      email: string;
      username: string;
      provider: string;
      createdAt: Date;
      updatedAt: Date;
      archivedAt: Date | null;
    }> = {},
  ): UserAggregate {
    const provider = overrides.provider ?? 'google';
    return this.create({
      ...overrides,
      accountType: AccountType.FLEXIBLE,
      createdWith: 'email',
    });
  }

  static createWithEmail(email: string): UserAggregate {
    return this.create({ email });
  }

  static createWithUsername(username: string): UserAggregate {
    return this.create({ username });
  }

  static createBlocked(
    overrides: Partial<{
      id: number;
      uuid: string;
      email: string;
      username: string;
      passwordHash: string | null;
      verificationBlockedUntil: Date;
      createdAt: Date;
      updatedAt: Date;
      archivedAt: Date | null;
    }> = {},
  ): UserAggregate {
    return this.create({
      ...overrides,
      verificationBlockedUntil:
        overrides.verificationBlockedUntil ?? new Date(Date.now() + 5 * 60 * 1000),
    });
  }

  static createVerified(
    overrides: Partial<{
      id: number;
      uuid: string;
      email: string;
      username: string;
      passwordHash: string | null;
      createdAt: Date;
      updatedAt: Date;
      archivedAt: Date | null;
    }> = {},
  ): UserAggregate {
    return this.create({
      ...overrides,
      status: 'active',
      emailVerifiedAt: new Date('2024-01-02T00:00:00Z'),
    });
  }

  static createPendingVerification(
    overrides: Partial<{
      id: number;
      uuid: string;
      email: string;
      username: string;
      passwordHash: string | null;
      createdAt: Date;
      updatedAt: Date;
      archivedAt: Date | null;
    }> = {},
  ): UserAggregate {
    return this.create({
      ...overrides,
      status: 'pending_verification',
      emailVerifiedAt: null,
    });
  }
}
