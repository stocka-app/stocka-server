import { ConfigService } from '@nestjs/config';

import { FacebookStrategy } from '@authentication/infrastructure/strategies/facebook.strategy';
import { AppleStrategy } from '@authentication/infrastructure/strategies/apple.strategy';
import { GoogleStrategy } from '@authentication/infrastructure/strategies/google.strategy';
import { MicrosoftStrategy } from '@authentication/infrastructure/strategies/microsoft.strategy';
import { JwtStrategy } from '@authentication/infrastructure/strategies/jwt.strategy';
import type { SocialProfile } from '@authentication/infrastructure/strategies/google.strategy';

// ── Helper ─────────────────────────────────────────────────────────────────────

/**
 * Builds a lightweight ConfigService mock.
 * - get(key, defaultValue) → overrides[key] ?? defaultValue  (mirrors real NestJS behaviour)
 * - getOrThrow(key)        → overrides[key] or throws        (mirrors real NestJS behaviour)
 */
function buildConfigService(overrides: Record<string, string> = {}): ConfigService {
  return {
    get: jest.fn(
      <T>(key: string, defaultValue?: T): T | undefined => (overrides[key] as T) ?? defaultValue,
    ),
    getOrThrow: jest.fn(<T>(key: string): T => {
      if (!(key in overrides)) throw new TypeError(`Configuration key "${key}" does not exist`);
      return overrides[key] as T;
    }),
  } as unknown as ConfigService;
}

function collectValidateResult(
  strategy: { validate: (...args: unknown[]) => void },
  ...args: unknown[]
): Promise<SocialProfile> {
  return new Promise((resolve, reject) => {
    strategy.validate(...args, (err: Error | null, user?: SocialProfile) => {
      if (err) reject(err);
      else resolve(user!);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FacebookStrategy
// ─────────────────────────────────────────────────────────────────────────────

describe('FacebookStrategy', () => {
  describe('Given no Facebook credentials in the environment (provider disabled)', () => {
    it('Then the strategy instantiates without throwing', () => {
      const configService = buildConfigService(); // no FB vars at all
      expect(() => new FacebookStrategy(configService)).not.toThrow();
    });
  });

  describe('Given Facebook credentials are configured', () => {
    let strategy: FacebookStrategy;

    beforeEach(() => {
      strategy = new FacebookStrategy(
        buildConfigService({
          FACEBOOK_APP_ID: 'test-app-id',
          FACEBOOK_APP_SECRET: 'test-app-secret',
          FACEBOOK_CALLBACK_URL: 'http://localhost:3001/api/authentication/facebook/callback',
        }),
      );
    });

    describe('When validate() receives a profile with email and displayName', () => {
      it('Then it resolves a SocialProfile with the correct fields', async () => {
        const profile = {
          id: 'fb-123',
          emails: [{ value: 'user@facebook.com' }],
          displayName: 'Facebook User',
          name: { givenName: 'Facebook', familyName: 'User' },
        };

        const user = await collectValidateResult(strategy, 'at', 'rt', profile);

        expect(user).toEqual<SocialProfile>({
          email: 'user@facebook.com',
          displayName: 'Facebook User',
          provider: 'facebook',
          providerId: 'fb-123',
          givenName: 'Facebook',
          familyName: 'User',
          avatarUrl: null,
          locale: null,
          emailVerified: false,
          jobTitle: null,
          rawData: {},
        });
      });
    });

    describe('When validate() receives a profile without emails', () => {
      it('Then email defaults to empty string and displayName is built from name parts', async () => {
        const profile = {
          id: 'fb-456',
          emails: undefined,
          displayName: '',
          name: { givenName: 'John', familyName: 'Doe' },
        };

        const user = await collectValidateResult(strategy, 'at', 'rt', profile);

        expect(user.email).toBe('');
        expect(user.displayName).toBe('John Doe');
      });
    });

    describe('When validate() receives a profile with no email and no name parts', () => {
      it('Then both email and displayName default to empty string', async () => {
        const profile = {
          id: 'fb-789',
          emails: undefined,
          displayName: '',
          name: undefined,
        };

        const user = await collectValidateResult(strategy, 'at', 'rt', profile);

        expect(user.email).toBe('');
        expect(user.displayName).toBe('');
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AppleStrategy
// ─────────────────────────────────────────────────────────────────────────────

describe('AppleStrategy', () => {
  describe('Given no Apple credentials in the environment (provider disabled)', () => {
    it('Then the strategy instantiates without throwing', () => {
      const configService = buildConfigService(); // no Apple vars at all
      expect(() => new AppleStrategy(configService)).not.toThrow();
    });
  });

  describe('Given Apple credentials are configured', () => {
    let strategy: AppleStrategy;

    beforeEach(() => {
      strategy = new AppleStrategy(
        buildConfigService({
          APPLE_CLIENT_ID: 'com.stocka.app',
          APPLE_TEAM_ID: 'TEAM123',
          APPLE_KEY_ID: 'KEY123',
          APPLE_PRIVATE_KEY: 'disabled',
          APPLE_CALLBACK_URL: 'http://localhost:3001/api/authentication/apple/callback',
        }),
      );
    });

    describe('When validate() receives a profile with firstName, lastName, and email', () => {
      it('Then displayName is "FirstName LastName" and email is mapped correctly', async () => {
        const profile = {
          id: 'apple-001',
          email: 'user@icloud.com',
          name: { firstName: 'Jane', lastName: 'Smith' },
        };

        const user = await collectValidateResult(strategy, 'at', 'rt', profile);

        expect(user).toEqual<SocialProfile>({
          email: 'user@icloud.com',
          displayName: 'Jane Smith',
          provider: 'apple',
          providerId: 'apple-001',
          givenName: 'Jane',
          familyName: 'Smith',
          avatarUrl: null,
          locale: null,
          emailVerified: true,
          jobTitle: null,
          rawData: {},
        });
      });
    });

    describe('When validate() receives a profile without a name but with email', () => {
      it('Then displayName falls back to the email prefix', async () => {
        const profile = { id: 'apple-002', email: 'prefix@icloud.com', name: undefined };

        const user = await collectValidateResult(strategy, 'at', 'rt', profile);

        expect(user.displayName).toBe('prefix');
        expect(user.email).toBe('prefix@icloud.com');
      });
    });

    describe('When validate() receives a profile with no name and no email', () => {
      it('Then displayName defaults to "Apple User" and email is empty string', async () => {
        const profile = { id: 'apple-003', email: undefined, name: undefined };

        const user = await collectValidateResult(strategy, 'at', 'rt', profile);

        expect(user.displayName).toBe('Apple User');
        expect(user.email).toBe('');
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GoogleStrategy
// ─────────────────────────────────────────────────────────────────────────────

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  beforeEach(() => {
    strategy = new GoogleStrategy(
      buildConfigService({
        GOOGLE_CLIENT_ID: 'google-client-id',
        GOOGLE_CLIENT_SECRET: 'google-secret',
        GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/authentication/google/callback',
      }),
    );
  });

  describe('When authorizationParams() is called', () => {
    it('Then it returns { prompt: "select_account" }', () => {
      expect(strategy.authorizationParams()).toEqual({ prompt: 'select_account' });
    });
  });

  describe('When validate() receives a profile with email and displayName', () => {
    it('Then it resolves a SocialProfile with the correct fields', async () => {
      const profile = {
        id: 'google-123',
        emails: [{ value: 'user@gmail.com' }],
        displayName: 'Google User',
      };

      const user = await collectValidateResult(strategy, 'at', 'rt', profile);

      expect(user).toEqual<SocialProfile>({
        email: 'user@gmail.com',
        displayName: 'Google User',
        provider: 'google',
        providerId: 'google-123',
        givenName: null,
        familyName: null,
        avatarUrl: null,
        locale: null,
        emailVerified: false,
        jobTitle: null,
        rawData: {},
      });
    });
  });

  describe('When validate() receives a profile without emails', () => {
    it('Then email defaults to empty string', async () => {
      const profile = { id: 'google-456', emails: undefined, displayName: 'No Email' };

      const user = await collectValidateResult(strategy, 'at', 'rt', profile);

      expect(user.email).toBe('');
      expect(user.displayName).toBe('No Email');
    });
  });

  describe('When validate() receives a profile with no displayName', () => {
    it('Then displayName defaults to empty string', async () => {
      const profile = { id: 'google-789', emails: [{ value: 'user@gmail.com' }], displayName: '' };

      const user = await collectValidateResult(strategy, 'at', 'rt', profile);

      expect(user.displayName).toBe('');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MicrosoftStrategy
// ─────────────────────────────────────────────────────────────────────────────

describe('MicrosoftStrategy', () => {
  let strategy: MicrosoftStrategy;

  beforeEach(() => {
    strategy = new MicrosoftStrategy(
      buildConfigService({
        MICROSOFT_CLIENT_ID: 'ms-client-id',
        MICROSOFT_CLIENT_SECRET: 'ms-secret',
        MICROSOFT_CALLBACK_URL: 'http://localhost:3001/api/authentication/microsoft/callback',
      }),
    );

    // Default: Graph photo endpoint returns a successful response with image bytes
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image-bytes')),
    } as unknown as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('When authorizationParams() is called', () => {
    it('Then it returns { prompt: "select_account" }', () => {
      expect(strategy.authorizationParams()).toEqual({ prompt: 'select_account' });
    });
  });

  describe('Given the user has a profile photo in Microsoft', () => {
    describe('When validate() is called', () => {
      it('Then avatarUrl is a base64 data URI from the Graph API photo', async () => {
        const profile = {
          id: 'ms-001',
          displayName: 'MS User',
          emails: [{ value: 'user@microsoft.com' }],
          _json: {},
        };

        const user = await collectValidateResult(strategy, 'at', 'rt', profile);

        expect(user.avatarUrl).toMatch(/^data:image\/jpeg;base64,/);
        expect(global.fetch).toHaveBeenCalledWith(
          'https://graph.microsoft.com/v1.0/me/photos/96x96/$value',
          { headers: { Authorization: 'Bearer at' } },
        );
      });
    });
  });

  describe('Given the user has no profile photo in Microsoft (Graph returns 404)', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as unknown as Response);
    });

    describe('When validate() is called', () => {
      it('Then avatarUrl is null', async () => {
        const profile = {
          id: 'ms-002',
          displayName: 'MS User',
          emails: [{ value: 'user@microsoft.com' }],
          _json: {},
        };

        const user = await collectValidateResult(strategy, 'at', 'rt', profile);

        expect(user.avatarUrl).toBeNull();
      });
    });
  });

  describe('Given the Graph API call throws a network error', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network timeout'));
    });

    describe('When validate() is called', () => {
      it('Then avatarUrl is null and the error is swallowed', async () => {
        const profile = {
          id: 'ms-003',
          displayName: 'MS User',
          emails: [{ value: 'user@microsoft.com' }],
          _json: {},
        };

        const user = await collectValidateResult(strategy, 'at', 'rt', profile);

        expect(user.avatarUrl).toBeNull();
      });
    });
  });

  describe('When validate() receives a profile with the emails array', () => {
    it('Then email is taken from emails[0].value', async () => {
      const profile = {
        id: 'ms-010',
        displayName: 'MS User',
        emails: [{ value: 'user@microsoft.com' }],
        _json: {},
      };

      const user = await collectValidateResult(strategy, 'at', 'rt', profile);

      expect(user.email).toBe('user@microsoft.com');
    });
  });

  describe('When validate() receives a profile without emails but with _json.mail', () => {
    it('Then email is taken from _json.mail', async () => {
      const profile = {
        id: 'ms-011',
        displayName: 'MS User',
        emails: undefined,
        _json: { mail: 'ms@company.com' },
      };

      const user = await collectValidateResult(strategy, 'at', 'rt', profile);

      expect(user.email).toBe('ms@company.com');
    });
  });

  describe('When validate() receives a profile with only _json.userPrincipalName', () => {
    it('Then email is taken from userPrincipalName', async () => {
      const profile = {
        id: 'ms-012',
        displayName: 'MS User',
        emails: undefined,
        _json: { userPrincipalName: 'upn@tenant.onmicrosoft.com' },
      };

      const user = await collectValidateResult(strategy, 'at', 'rt', profile);

      expect(user.email).toBe('upn@tenant.onmicrosoft.com');
    });
  });

  describe('When validate() receives a profile with no email source', () => {
    it('Then email defaults to empty string', async () => {
      const profile = { id: 'ms-013', displayName: 'MS User', emails: undefined, _json: {} };

      const user = await collectValidateResult(strategy, 'at', 'rt', profile);

      expect(user.email).toBe('');
    });
  });

  describe('When validate() receives a profile with no displayName', () => {
    it('Then displayName defaults to empty string', async () => {
      const profile = {
        id: 'ms-014',
        displayName: '',
        emails: [{ value: 'user@ms.com' }],
        _json: {},
      };

      const user = await collectValidateResult(strategy, 'at', 'rt', profile);

      expect(user.displayName).toBe('');
    });
  });

  describe('When validate() receives a profile with no _json', () => {
    it('Then rawData defaults to empty object and optional fields are null', async () => {
      const profile = {
        id: 'ms-015',
        displayName: 'MS User',
        emails: [{ value: 'user@ms.com' }],
        _json: undefined,
      };

      const user = await collectValidateResult(strategy, 'at', 'rt', profile);

      expect(user.rawData).toEqual({});
      expect(user.givenName).toBeNull();
      expect(user.familyName).toBeNull();
      expect(user.locale).toBeNull();
      expect(user.jobTitle).toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JwtStrategy
// ─────────────────────────────────────────────────────────────────────────────

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(buildConfigService({ JWT_ACCESS_SECRET: 'test-secret' }));
  });

  describe('When validate() receives a complete JWT payload', () => {
    it('Then it returns the user object with uuid, email, tenantId, and role', () => {
      const payload = {
        sub: '019d07d4-4e12-721d-946f-86cd3d1e7f27',
        email: 'user@stocka.app',
        tenantId: '019d07d4-0000-721d-0000-000000000000',
        role: 'OWNER',
        iat: 1000,
        exp: 2000,
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        uuid: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        role: payload.role,
      });
    });
  });

  describe('When validate() receives a payload with null tenantId and role', () => {
    it('Then tenantId and role are null in the result', () => {
      const payload = {
        sub: '019d07d4-4e12-721d-946f-86cd3d1e7f28',
        email: 'user@stocka.app',
        tenantId: null,
        role: null,
        iat: 1000,
        exp: 2000,
      };

      const result = strategy.validate(payload);

      expect(result.tenantId).toBeNull();
      expect(result.role).toBeNull();
    });
  });
});
