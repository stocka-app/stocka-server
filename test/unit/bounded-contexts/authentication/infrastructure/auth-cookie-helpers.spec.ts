import {
  setRefreshCookie,
  clearRefreshCookie,
} from '@authentication/infrastructure/helpers/refresh-cookie.helper';
import {
  PopupStateStore,
  isPopupState,
} from '@authentication/infrastructure/helpers/popup-state-store';
import { Response, Request } from 'express';

// ── Helper ────────────────────────────────────────────────────────────────────

function buildMockResponse(): jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>> {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>>;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('setRefreshCookie', () => {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  describe('Given a valid token in a non-production environment', () => {
    let originalNodeEnv: string | undefined;

    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('Then it sets the refresh_token cookie with secure: false', () => {
      const res = buildMockResponse();
      setRefreshCookie(res as unknown as Response, 'my-refresh-token');

      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'my-refresh-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/api/authentication',
        maxAge: SEVEN_DAYS_MS,
      });
    });
  });

  describe('Given a valid token in a production environment', () => {
    let originalNodeEnv: string | undefined;

    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('Then it sets the refresh_token cookie with secure: true', () => {
      const res = buildMockResponse();
      setRefreshCookie(res as unknown as Response, 'prod-token');

      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'prod-token', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api/authentication',
        maxAge: SEVEN_DAYS_MS,
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('clearRefreshCookie', () => {
  describe('Given a response object', () => {
    it('Then it clears the refresh_token cookie with the correct path', () => {
      const res = buildMockResponse();
      clearRefreshCookie(res as unknown as Response);

      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/api/authentication',
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PopupStateStore', () => {
  let store: PopupStateStore;

  beforeEach(() => {
    store = new PopupStateStore();
  });

  describe('Given a request with mode=popup in the query string', () => {
    describe('When store is called', () => {
      it('Then it produces a state string prefixed with "popup:"', (done) => {
        const req = { query: { mode: 'popup' } } as unknown as Request;

        store.store(req, (err, state) => {
          expect(err).toBeNull();
          expect(state).toMatch(/^popup:[a-f0-9]{32}$/);
          done();
        });
      });
    });
  });

  describe('Given a request without mode=popup in the query string', () => {
    describe('When store is called', () => {
      it('Then it produces a state string without the popup prefix', (done) => {
        const req = { query: {} } as unknown as Request;

        store.store(req, (err, state) => {
          expect(err).toBeNull();
          expect(state).not.toMatch(/^popup:/);
          expect(state).toMatch(/^[a-f0-9]{32}$/);
          done();
        });
      });
    });
  });

  describe('Given any OAuth state value', () => {
    describe('When verify is called', () => {
      it('Then it always accepts the state', (done) => {
        const req = {} as unknown as Request;

        store.verify(req, 'any-state-value', (err, ok) => {
          expect(err).toBeNull();
          expect(ok).toBe(true);
          done();
        });
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('isPopupState', () => {
  describe('Given a state string that starts with "popup:"', () => {
    it('Then it returns true', () => {
      expect(isPopupState('popup:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe(true);
    });
  });

  describe('Given a state string that does not start with "popup:"', () => {
    it('Then it returns false for a standard state', () => {
      expect(isPopupState('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe(false);
    });

    it('Then it returns false for an empty string', () => {
      expect(isPopupState('')).toBe(false);
    });
  });

  describe('Given an undefined state', () => {
    it('Then it returns false', () => {
      expect(isPopupState(undefined)).toBe(false);
    });
  });
});
