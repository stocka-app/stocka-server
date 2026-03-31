import { SessionMapper } from '@user/account/session/infrastructure/mappers/session.mapper';
import { CredentialSessionMapper } from '@user/account/session/infrastructure/mappers/credential-session.mapper';
import { SocialSessionMapper } from '@user/account/session/infrastructure/mappers/social-session.mapper';
import { EmailVerificationTokenMapper } from '@authentication/infrastructure/persistence/mappers/email-verification-token.mapper';
import { PasswordResetTokenMapper } from '@authentication/infrastructure/persistence/mappers/password-reset-token.mapper';
import { VerificationAttemptMapper } from '@authentication/infrastructure/persistence/mappers/verification-attempt.mapper';

import { SessionAggregate } from '@user/account/session/domain/session.aggregate';
import { CredentialSessionModel } from '@user/account/session/domain/models/credential-session.model';
import { SocialSessionModel } from '@user/account/session/domain/models/social-session.model';
import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';
import { PasswordResetTokenModel } from '@authentication/domain/models/password-reset-token.model';
import { VerificationAttemptModel } from '@authentication/domain/models/verification-attempt.model';

import { SessionEntity } from '@user/account/session/infrastructure/entities/session.entity';
import { CredentialSessionEntity } from '@user/account/session/infrastructure/entities/credential-session.entity';
import { SocialSessionEntity } from '@user/account/session/infrastructure/entities/social-session.entity';
import { EmailVerificationTokenEntity } from '@authentication/infrastructure/persistence/entities/email-verification-token.entity';
import { PasswordResetTokenEntity } from '@authentication/infrastructure/persistence/entities/password-reset-token.entity';
import { VerificationAttemptEntity } from '@authentication/infrastructure/persistence/entities/verification-attempt.entity';

// ── Builders ───────────────────────────────────────────────────────────────────

// Valid UUID v4 constants for test data
const UUID_SESSION = '550e8400-e29b-41d4-a716-446655440001';
const UUID_CRED_SESSION = '550e8400-e29b-41d4-a716-446655440006';
const UUID_SOC_SESSION = '550e8400-e29b-41d4-a716-446655440007';
const UUID_EVT = '550e8400-e29b-41d4-a716-446655440002';
const UUID_PRT = '550e8400-e29b-41d4-a716-446655440003';
const UUID_VA = '550e8400-e29b-41d4-a716-446655440004';
const UUID_USER = '550e8400-e29b-41d4-a716-446655440005';

function buildSessionEntity(overrides?: Partial<SessionEntity>): SessionEntity {
  const e = new SessionEntity();
  e.id = 1;
  e.uuid = UUID_SESSION;
  e.accountId = 42;
  e.tokenHash = 'a'.repeat(64);
  e.expiresAt = new Date('2099-01-01');
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

function buildEmailVerificationTokenEntity(
  overrides?: Partial<EmailVerificationTokenEntity>,
): EmailVerificationTokenEntity {
  const e = new EmailVerificationTokenEntity();
  e.id = 1;
  e.uuid = UUID_EVT;
  e.credentialAccountId = 42;
  e.codeHash = 'b'.repeat(64);
  e.expiresAt = new Date('2099-01-01');
  e.usedAt = null;
  e.resendCount = 0;
  e.lastResentAt = null;
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

function buildPasswordResetTokenEntity(
  overrides?: Partial<PasswordResetTokenEntity>,
): PasswordResetTokenEntity {
  const e = new PasswordResetTokenEntity();
  e.id = 1;
  e.uuid = UUID_PRT;
  e.credentialAccountId = 42;
  e.tokenHash = 'c'.repeat(64);
  e.expiresAt = new Date('2099-01-01');
  e.usedAt = null;
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

function buildVerificationAttemptEntity(
  overrides?: Partial<VerificationAttemptEntity>,
): VerificationAttemptEntity {
  const e = new VerificationAttemptEntity();
  e.id = 1;
  e.uuid = UUID_VA;
  e.userUUID = UUID_USER;
  e.email = 'user@example.com';
  e.ipAddress = '127.0.0.1';
  e.userAgent = 'Mozilla/5.0';
  e.codeEntered = 'ABC234'; // only chars from charset: ABCDEFGHJKMNPQRSTUVWXYZ23456789
  e.success = false;
  e.verificationType = 'email_verification';
  e.attemptedAt = new Date('2024-01-01');
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

function buildCredentialSessionEntity(
  overrides?: Partial<CredentialSessionEntity>,
): CredentialSessionEntity {
  const e = new CredentialSessionEntity();
  e.id = 5;
  e.uuid = UUID_CRED_SESSION;
  e.sessionId = 1;
  e.credentialAccountId = 42;
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

function buildSocialSessionEntity(overrides?: Partial<SocialSessionEntity>): SocialSessionEntity {
  const e = new SocialSessionEntity();
  e.id = 6;
  e.uuid = UUID_SOC_SESSION;
  e.sessionId = 2;
  e.socialAccountId = 7;
  e.provider = 'google';
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('SessionMapper', () => {
  describe('Given a SessionEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a SessionAggregate with all fields mapped correctly', () => {
        const entity = buildSessionEntity();
        const model = SessionMapper.toDomain(entity);

        expect(model).toBeInstanceOf(SessionAggregate);
        expect(model.id).toBe(entity.id);
        expect(model.uuid).toBe(entity.uuid);
        expect(model.accountId).toBe(entity.accountId);
        expect(model.tokenHash).toBe(entity.tokenHash);
        expect(model.expiresAt).toEqual(entity.expiresAt);
        expect(model.archivedAt).toBeNull();
      });
    });
  });

  describe('Given a SessionModel with an id', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a Partial<SessionEntity> including the id', () => {
        const entity = buildSessionEntity();
        const model = SessionMapper.toDomain(entity);
        const result = SessionMapper.toEntity(model);

        expect(result.id).toBe(1);
        expect(result.uuid).toBe(entity.uuid);
        expect(result.accountId).toBe(entity.accountId);
        expect(result.tokenHash).toBe(entity.tokenHash);
      });
    });
  });

  describe('Given a SessionModel without an id (new session)', () => {
    describe('When toEntity is called', () => {
      it('Then the id field is omitted from the result', () => {
        const model = SessionAggregate.reconstitute({
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440099',
          accountId: 99,
          tokenHash: 'd'.repeat(64),
          expiresAt: new Date('2099-01-01'),
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });

        // Override id to be undefined to test the branch
        Object.defineProperty(model, 'id', { get: () => undefined });

        const result = SessionMapper.toEntity(model);
        expect(result.id).toBeUndefined();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('EmailVerificationTokenMapper', () => {
  describe('Given an EmailVerificationTokenEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns an EmailVerificationTokenModel with all fields mapped', () => {
        const entity = buildEmailVerificationTokenEntity({ resendCount: 2 });
        const model = EmailVerificationTokenMapper.toDomain(entity);

        expect(model).toBeInstanceOf(EmailVerificationTokenModel);
        expect(model.id).toBe(entity.id);
        expect(model.credentialAccountId).toBe(entity.credentialAccountId);
        expect(model.codeHash).toBe(entity.codeHash);
        expect(model.resendCount).toBe(2);
        expect(model.usedAt).toBeNull();
      });
    });

    describe('When toDomain is called with a usedAt date', () => {
      it('Then usedAt is set on the model', () => {
        const usedDate = new Date('2024-06-01');
        const entity = buildEmailVerificationTokenEntity({ usedAt: usedDate });
        const model = EmailVerificationTokenMapper.toDomain(entity);

        expect(model.usedAt).not.toBeNull();
      });
    });
  });

  describe('Given an EmailVerificationTokenModel with an id', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a Partial<EmailVerificationTokenEntity> with id included', () => {
        const entity = buildEmailVerificationTokenEntity();
        const model = EmailVerificationTokenMapper.toDomain(entity);
        const result = EmailVerificationTokenMapper.toEntity(model);

        expect(result.credentialAccountId).toBe(entity.credentialAccountId);
        expect(result.codeHash).toBe(entity.codeHash);
        expect(result.resendCount).toBe(entity.resendCount);
        expect(result.id).toBe(entity.id);
      });
    });
  });

  describe('Given an EmailVerificationTokenModel without an id (new token)', () => {
    describe('When toEntity is called', () => {
      it('Then the id field is omitted from the result', () => {
        const entity = buildEmailVerificationTokenEntity();
        const model = EmailVerificationTokenMapper.toDomain(entity);
        Object.defineProperty(model, 'id', { get: () => undefined });

        const result = EmailVerificationTokenMapper.toEntity(model);
        expect(result.id).toBeUndefined();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PasswordResetTokenMapper', () => {
  describe('Given a PasswordResetTokenEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a PasswordResetTokenModel with all fields mapped', () => {
        const entity = buildPasswordResetTokenEntity();
        const model = PasswordResetTokenMapper.toDomain(entity);

        expect(model).toBeInstanceOf(PasswordResetTokenModel);
        expect(model.id).toBe(entity.id);
        expect(model.credentialAccountId).toBe(entity.credentialAccountId);
        expect(model.tokenHash).toBe(entity.tokenHash);
        expect(model.usedAt).toBeNull();
      });
    });

    describe('When toDomain is called with a usedAt date', () => {
      it('Then usedAt is set on the model', () => {
        const usedDate = new Date('2024-05-01');
        const entity = buildPasswordResetTokenEntity({ usedAt: usedDate });
        const model = PasswordResetTokenMapper.toDomain(entity);
        expect(model.usedAt).not.toBeNull();
      });
    });
  });

  describe('Given a PasswordResetTokenModel with an id', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a Partial entity with id included', () => {
        const entity = buildPasswordResetTokenEntity();
        const model = PasswordResetTokenMapper.toDomain(entity);
        const result = PasswordResetTokenMapper.toEntity(model);

        expect(result.id).toBe(entity.id);
        expect(result.credentialAccountId).toBe(entity.credentialAccountId);
        expect(result.tokenHash).toBe(entity.tokenHash);
      });
    });
  });

  describe('Given a PasswordResetTokenModel without an id (new token)', () => {
    describe('When toEntity is called', () => {
      it('Then the id field is omitted from the result', () => {
        const entity = buildPasswordResetTokenEntity();
        const model = PasswordResetTokenMapper.toDomain(entity);
        Object.defineProperty(model, 'id', { get: () => undefined });

        const result = PasswordResetTokenMapper.toEntity(model);
        expect(result.id).toBeUndefined();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('VerificationAttemptMapper', () => {
  describe('Given a VerificationAttemptEntity with all fields populated', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a VerificationAttemptModel with all fields mapped', () => {
        const entity = buildVerificationAttemptEntity();
        const model = VerificationAttemptMapper.toDomain(entity);

        expect(model).toBeInstanceOf(VerificationAttemptModel);
        expect(model.id).toBe(entity.id);
        expect(model.ipAddress.toString()).toBe(entity.ipAddress);
      });
    });
  });

  describe('Given a VerificationAttemptEntity with nullable fields as null', () => {
    describe('When toDomain is called', () => {
      it('Then the model is created without throwing', () => {
        const entity = buildVerificationAttemptEntity({
          userUUID: null,
          email: null,
          userAgent: null,
          codeEntered: null,
        });
        expect(() => VerificationAttemptMapper.toDomain(entity)).not.toThrow();
      });
    });
  });

  describe('Given a VerificationAttemptModel', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a Partial entity with all mapped fields', () => {
        const entity = buildVerificationAttemptEntity({ success: true });
        const model = VerificationAttemptMapper.toDomain(entity);
        const result = VerificationAttemptMapper.toEntity(model);

        expect(result.ipAddress).toBe(entity.ipAddress);
        expect(result.verificationType).toBe(entity.verificationType);
        expect(result.success).toBe(true);
        expect(result.id).toBe(entity.id);
      });
    });

    describe('When toEntity is called with null nullable fields', () => {
      it('Then nullable fields are coerced to null in the entity', () => {
        const entity = buildVerificationAttemptEntity({
          userUUID: null,
          email: null,
          userAgent: null,
          codeEntered: null,
        });
        const model = VerificationAttemptMapper.toDomain(entity);
        const result = VerificationAttemptMapper.toEntity(model);

        expect(result.userUUID).toBeNull();
        expect(result.email).toBeNull();
        expect(result.userAgent).toBeNull();
        expect(result.codeEntered).toBeNull();
      });
    });

    describe('When toEntity is called on a model without an id (new attempt)', () => {
      it('Then the id field is omitted from the result', () => {
        const entity = buildVerificationAttemptEntity();
        const model = VerificationAttemptMapper.toDomain(entity);
        Object.defineProperty(model, 'id', { get: () => undefined });

        const result = VerificationAttemptMapper.toEntity(model);
        expect(result.id).toBeUndefined();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('CredentialSessionMapper', () => {
  describe('Given a CredentialSessionEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a CredentialSessionModel with all fields mapped', () => {
        const entity = buildCredentialSessionEntity();
        const model = CredentialSessionMapper.toDomain(entity);

        expect(model).toBeInstanceOf(CredentialSessionModel);
        expect(model.id).toBe(entity.id);
        expect(model.uuid).toBe(entity.uuid);
        expect(model.sessionId).toBe(entity.sessionId);
        expect(model.credentialAccountId).toBe(entity.credentialAccountId);
        expect(model.archivedAt).toBeNull();
      });
    });
  });

  describe('Given a CredentialSessionModel with an id', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a Partial entity with id and FK fields', () => {
        const entity = buildCredentialSessionEntity();
        const model = CredentialSessionMapper.toDomain(entity);
        const result = CredentialSessionMapper.toEntity(model, entity.sessionId);

        expect(result.id).toBe(entity.id);
        expect(result.sessionId).toBe(entity.sessionId);
        expect(result.credentialAccountId).toBe(entity.credentialAccountId);
      });
    });
  });

  describe('Given a CredentialSessionModel without an id (new record)', () => {
    describe('When toEntity is called', () => {
      it('Then the id field is omitted from the result', () => {
        const entity = buildCredentialSessionEntity();
        const model = CredentialSessionMapper.toDomain(entity);
        Object.defineProperty(model, 'id', { get: () => undefined });

        const result = CredentialSessionMapper.toEntity(model, entity.sessionId);
        expect(result.id).toBeUndefined();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SocialSessionMapper', () => {
  describe('Given a SocialSessionEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a SocialSessionModel with all fields mapped', () => {
        const entity = buildSocialSessionEntity();
        const model = SocialSessionMapper.toDomain(entity);

        expect(model).toBeInstanceOf(SocialSessionModel);
        expect(model.id).toBe(entity.id);
        expect(model.uuid).toBe(entity.uuid);
        expect(model.sessionId).toBe(entity.sessionId);
        expect(model.socialAccountId).toBe(entity.socialAccountId);
        expect(model.provider).toBe(entity.provider);
        expect(model.archivedAt).toBeNull();
      });
    });
  });

  describe('Given a SocialSessionModel with an id', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a Partial entity with id and FK fields', () => {
        const entity = buildSocialSessionEntity();
        const model = SocialSessionMapper.toDomain(entity);
        const result = SocialSessionMapper.toEntity(model, entity.sessionId);

        expect(result.id).toBe(entity.id);
        expect(result.sessionId).toBe(entity.sessionId);
        expect(result.socialAccountId).toBe(entity.socialAccountId);
        expect(result.provider).toBe(entity.provider);
      });
    });
  });

  describe('Given a SocialSessionModel without an id (new record)', () => {
    describe('When toEntity is called', () => {
      it('Then the id field is omitted from the result', () => {
        const entity = buildSocialSessionEntity();
        const model = SocialSessionMapper.toDomain(entity);
        Object.defineProperty(model, 'id', { get: () => undefined });

        const result = SocialSessionMapper.toEntity(model, entity.sessionId);
        expect(result.id).toBeUndefined();
      });
    });
  });
});
