import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtOptionalGuard } from '@common/guards/jwt-optional.guard';

describe('JwtOptionalGuard', () => {
  let guard: JwtOptionalGuard;

  beforeEach(() => {
    guard = new JwtOptionalGuard();
  });

  // ── handleRequest ──────────────────────────────────────────────────────────

  describe('Given a valid JWT token (user resolved, no error)', () => {
    it('Then handleRequest returns the resolved user', () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      const result = guard.handleRequest(null, user);
      expect(result).toBe(user);
    });
  });

  describe('Given the JWT token is missing or malformed (no user)', () => {
    it('Then handleRequest returns null without throwing', () => {
      expect(() => guard.handleRequest(null, null)).not.toThrow();
      expect(guard.handleRequest(null, null)).toBeNull();
    });
  });

  describe('Given the JWT token is invalid (AuthGuard throws an error)', () => {
    it('Then handleRequest swallows the error and returns null instead of throwing', () => {
      const error = new Error('JsonWebTokenError: invalid signature');
      expect(() => guard.handleRequest(error, null)).not.toThrow();
      expect(guard.handleRequest(error, null)).toBeNull();
    });
  });

  describe('Given a valid user AND an error arrive simultaneously', () => {
    it('Then handleRequest still returns null (error takes precedence over user)', () => {
      const error = new Error('Unexpected error');
      const user = { id: 'user-123' };
      expect(guard.handleRequest(error, user)).toBeNull();
    });
  });

  // ── canActivate ────────────────────────────────────────────────────────────

  describe('Given the parent AuthGuard resolves successfully', () => {
    it('Then canActivate delegates to super.canActivate and returns true', async () => {
      const context = {} as ExecutionContext;
      const spy = jest
        .spyOn(AuthGuard('jwt').prototype as { canActivate: (ctx: ExecutionContext) => Promise<boolean> }, 'canActivate')
        .mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      spy.mockRestore();
    });
  });

  describe('Given the parent AuthGuard throws (token invalid, handled via handleRequest)', () => {
    it('Then canActivate propagates the resolved value (handleRequest already swallowed the error)', async () => {
      const context = {} as ExecutionContext;
      const spy = jest
        .spyOn(AuthGuard('jwt').prototype as { canActivate: (ctx: ExecutionContext) => Promise<boolean> }, 'canActivate')
        .mockResolvedValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      spy.mockRestore();
    });
  });
});
