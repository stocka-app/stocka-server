import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SocialAccountModel } from '@user/account/domain/models/social-account.model';
import { CredentialSessionModel } from '@user/account/session/domain/models/credential-session.model';
import { SocialSessionModel } from '@user/account/session/domain/models/social-session.model';
import { PersonalProfileModel } from '@user/profile/domain/models/personal-profile.model';
import { SocialProfileModel } from '@user/profile/domain/models/social-profile.model';

const NOW = new Date('2024-06-01T00:00:00.000Z');
const CREATED_AT = new Date('2024-01-01T00:00:00.000Z');
const ENTRY_UUID = '019538a0-0000-7000-8000-000000000001';

describe('CredentialAccountModel getters', () => {
  it('Then it exposes createdAt, updatedAt, and archivedAt', () => {
    const model = CredentialAccountModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      accountId: 42,
      email: 'user@example.com',
      passwordHash: null,
      status: 'active',
      emailVerifiedAt: null,
      verificationBlockedUntil: null,
      createdWith: 'email',
      createdAt: CREATED_AT,
      updatedAt: NOW,
      archivedAt: null,
    });

    expect(model.createdAt).toEqual(CREATED_AT);
    expect(model.updatedAt).toEqual(NOW);
    expect(model.archivedAt).toBeNull();
  });

  it('Then the constructor falls back to defaults when timestamps are missing', () => {
    const model = CredentialAccountModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      accountId: 42,
      email: 'user@example.com',
      passwordHash: null,
      status: 'active',
      emailVerifiedAt: null,
      verificationBlockedUntil: null,
      createdWith: 'email',
      createdAt: undefined as unknown as Date,
      updatedAt: undefined as unknown as Date,
      archivedAt: undefined as unknown as Date | null,
    });

    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.updatedAt).toBeInstanceOf(Date);
    expect(model.archivedAt).toBeNull();
  });
});

describe('SocialAccountModel getters', () => {
  it('Then it exposes createdAt, updatedAt, and archivedAt', () => {
    const model = SocialAccountModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      accountId: 42,
      provider: 'google',
      providerId: 'g-123',
      providerEmail: 'user@example.com',
      linkedAt: CREATED_AT,
      createdAt: CREATED_AT,
      updatedAt: NOW,
      archivedAt: null,
    });

    expect(model.createdAt).toEqual(CREATED_AT);
    expect(model.updatedAt).toEqual(NOW);
    expect(model.archivedAt).toBeNull();
  });

  it('Then the constructor falls back to defaults when timestamps are missing', () => {
    const model = SocialAccountModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      accountId: 42,
      provider: 'google',
      providerId: 'g-123',
      providerEmail: null,
      linkedAt: CREATED_AT,
      createdAt: undefined as unknown as Date,
      updatedAt: undefined as unknown as Date,
      archivedAt: undefined as unknown as Date | null,
    });

    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.updatedAt).toBeInstanceOf(Date);
    expect(model.archivedAt).toBeNull();
  });
});

describe('CredentialSessionModel getters', () => {
  it('Then it exposes createdAt, updatedAt, and archivedAt', () => {
    const model = CredentialSessionModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      sessionId: 9,
      credentialAccountId: 42,
      createdAt: CREATED_AT,
      updatedAt: NOW,
      archivedAt: null,
    });

    expect(model.createdAt).toEqual(CREATED_AT);
    expect(model.updatedAt).toEqual(NOW);
    expect(model.archivedAt).toBeNull();
  });

  it('Then the constructor falls back to defaults when timestamps are missing', () => {
    const model = CredentialSessionModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      sessionId: 9,
      credentialAccountId: 42,
      createdAt: undefined as unknown as Date,
      updatedAt: undefined as unknown as Date,
      archivedAt: undefined as unknown as Date | null,
    });

    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.updatedAt).toBeInstanceOf(Date);
    expect(model.archivedAt).toBeNull();
  });
});

describe('SocialSessionModel getters', () => {
  it('Then it exposes createdAt, updatedAt, and archivedAt', () => {
    const model = SocialSessionModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      sessionId: 9,
      socialAccountId: 42,
      provider: 'google',
      createdAt: CREATED_AT,
      updatedAt: NOW,
      archivedAt: null,
    });

    expect(model.createdAt).toEqual(CREATED_AT);
    expect(model.updatedAt).toEqual(NOW);
    expect(model.archivedAt).toBeNull();
  });

  it('Then the constructor falls back to defaults when timestamps are missing', () => {
    const model = SocialSessionModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      sessionId: 9,
      socialAccountId: 42,
      provider: 'google',
      createdAt: undefined as unknown as Date,
      updatedAt: undefined as unknown as Date,
      archivedAt: undefined as unknown as Date | null,
    });

    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.updatedAt).toBeInstanceOf(Date);
    expect(model.archivedAt).toBeNull();
  });
});

describe('PersonalProfileModel getters', () => {
  it('Then it exposes createdAt, updatedAt, and archivedAt', () => {
    const model = PersonalProfileModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      profileId: 7,
      username: 'austin',
      displayName: 'Austin',
      avatarUrl: null,
      locale: 'es-MX',
      timezone: 'America/Mexico_City',
      createdAt: CREATED_AT,
      updatedAt: NOW,
      archivedAt: null,
    });

    expect(model.createdAt).toEqual(CREATED_AT);
    expect(model.updatedAt).toEqual(NOW);
    expect(model.archivedAt).toBeNull();
  });

  it('Then the constructor falls back to defaults when timestamps are missing', () => {
    const model = PersonalProfileModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      profileId: 7,
      username: 'austin',
      displayName: null,
      avatarUrl: null,
      locale: 'es-MX',
      timezone: 'America/Mexico_City',
      createdAt: undefined as unknown as Date,
      updatedAt: undefined as unknown as Date,
      archivedAt: undefined as unknown as Date | null,
    });

    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.updatedAt).toBeInstanceOf(Date);
    expect(model.archivedAt).toBeNull();
  });
});

describe('SocialProfileModel getters', () => {
  it('Then it exposes createdAt, updatedAt, and archivedAt', () => {
    const model = SocialProfileModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      profileId: 7,
      socialAccountUUID: '019538a0-0000-7000-8000-000000000002',
      provider: 'google',
      providerDisplayName: 'Austin',
      providerAvatarUrl: null,
      providerProfileUrl: null,
      givenName: null,
      familyName: null,
      locale: null,
      emailVerified: true,
      jobTitle: null,
      rawData: {},
      syncedAt: CREATED_AT,
      createdAt: CREATED_AT,
      updatedAt: NOW,
      archivedAt: null,
    });

    expect(model.createdAt).toEqual(CREATED_AT);
    expect(model.updatedAt).toEqual(NOW);
    expect(model.archivedAt).toBeNull();
  });

  it('Then the constructor falls back to defaults when timestamps are missing', () => {
    const model = SocialProfileModel.reconstitute({
      id: 1,
      uuid: ENTRY_UUID,
      profileId: 7,
      socialAccountUUID: '019538a0-0000-7000-8000-000000000002',
      provider: 'google',
      providerDisplayName: null,
      providerAvatarUrl: null,
      providerProfileUrl: null,
      givenName: null,
      familyName: null,
      locale: null,
      emailVerified: false,
      jobTitle: null,
      rawData: {},
      syncedAt: CREATED_AT,
      createdAt: undefined as unknown as Date,
      updatedAt: undefined as unknown as Date,
      archivedAt: undefined as unknown as Date | null,
    });

    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.updatedAt).toBeInstanceOf(Date);
    expect(model.archivedAt).toBeNull();
  });
});
