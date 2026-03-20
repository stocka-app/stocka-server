import {
  setRefreshCookie,
  clearRefreshCookie,
} from '@authentication/infrastructure/helpers/refresh-cookie.helper';
import {
  setPopupModeCookie,
  sendPopupResponse,
  POPUP_OAUTH_MODE_COOKIE,
  POPUP_OAUTH_MODE_VALUE,
} from '@authentication/infrastructure/helpers/popup-html.helper';
import { Response } from 'express';

// ── Helper ────────────────────────────────────────────────────────────────────

function buildMockResponse(): jest.Mocked<Pick<Response, 'cookie' | 'clearCookie' | 'setHeader' | 'send'>> {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    setHeader: jest.fn(),
    send: jest.fn(),
  } as unknown as jest.Mocked<Pick<Response, 'cookie' | 'clearCookie' | 'setHeader' | 'send'>>;
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

describe('setPopupModeCookie', () => {
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  describe('Given a response object in a non-production environment', () => {
    let originalNodeEnv: string | undefined;

    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('Then it sets the oauth_mode cookie with secure: false and a 5-minute maxAge', () => {
      const res = buildMockResponse();
      setPopupModeCookie(res as unknown as Response);

      expect(res.cookie).toHaveBeenCalledWith(POPUP_OAUTH_MODE_COOKIE, POPUP_OAUTH_MODE_VALUE, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/api/authentication',
        maxAge: FIVE_MINUTES_MS,
      });
    });
  });

  describe('Given a response object in a production environment', () => {
    let originalNodeEnv: string | undefined;

    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('Then it sets the oauth_mode cookie with secure: true', () => {
      const res = buildMockResponse();
      setPopupModeCookie(res as unknown as Response);

      expect(res.cookie).toHaveBeenCalledWith(POPUP_OAUTH_MODE_COOKIE, POPUP_OAUTH_MODE_VALUE, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api/authentication',
        maxAge: FIVE_MINUTES_MS,
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('sendPopupResponse', () => {
  describe('Given a valid access token and frontend origin', () => {
    it('Then it sets a narrow Content-Security-Policy that permits inline scripts', () => {
      const res = buildMockResponse();
      sendPopupResponse(res as unknown as Response, 'test-access-token', 'https://app.stocka.mx');

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'none'; script-src 'unsafe-inline'",
      );
    });

    it('Then it sets Cross-Origin-Opener-Policy to unsafe-none to preserve window.opener', () => {
      const res = buildMockResponse();
      sendPopupResponse(res as unknown as Response, 'test-access-token', 'https://app.stocka.mx');

      expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'unsafe-none');
    });

    it('Then it sends HTML that posts the token to the opener and closes the window', () => {
      const res = buildMockResponse();
      sendPopupResponse(res as unknown as Response, 'test-access-token', 'https://app.stocka.mx');

      const sentHtml = (res.send as jest.Mock).mock.calls[0][0] as string;
      expect(sentHtml).toContain('<!DOCTYPE html>');
      expect(sentHtml).toContain("type: 'oauth-success'");
      expect(sentHtml).toContain("accessToken: 'test-access-token'");
      expect(sentHtml).toContain("'https://app.stocka.mx'");
      expect(sentHtml).toContain('window.opener.postMessage');
      expect(sentHtml).toContain('window.close()');
    });
  });

  describe('Given a different token and localhost origin', () => {
    it('Then it embeds the correct token and origin in the generated HTML', () => {
      const res = buildMockResponse();
      sendPopupResponse(res as unknown as Response, 'jwt.token.value', 'http://localhost:5173');

      const sentHtml = (res.send as jest.Mock).mock.calls[0][0] as string;
      expect(sentHtml).toContain("accessToken: 'jwt.token.value'");
      expect(sentHtml).toContain("'http://localhost:5173'");
    });
  });
});
