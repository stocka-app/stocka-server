import { TransformInterceptor, ApiResponse } from '@shared/infrastructure/interceptors/transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildContext(): ExecutionContext {
  return {} as ExecutionContext;
}

function buildHandler<T>(value: T): CallHandler {
  return { handle: () => of(value) } as CallHandler;
}

async function intercept<T>(value: T): Promise<ApiResponse<T>> {
  const interceptor = new TransformInterceptor<T>();
  const observable = interceptor.intercept(buildContext(), buildHandler(value));
  return lastValueFrom(observable);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('TransformInterceptor', () => {
  describe('Given a plain value returned from the handler', () => {
    it('Then it wraps it in the { data, success: true } envelope', async () => {
      const result = await intercept('hello');
      expect(result).toEqual({ data: 'hello', success: true });
    });

    it('Then it wraps a plain object that has no "success" key', async () => {
      const result = await intercept({ name: 'Roberto' });
      expect(result).toEqual({ data: { name: 'Roberto' }, success: true });
    });

    it('Then it wraps null as data', async () => {
      const result = await intercept(null);
      expect(result).toEqual({ data: null, success: true });
    });
  });

  describe('Given a result that already has the { success, data } envelope structure', () => {
    it('Then it returns the result as-is without double-wrapping', async () => {
      const already: ApiResponse<string> = { success: true, data: 'already wrapped' };
      const result = await intercept(already);
      expect(result).toEqual({ success: true, data: 'already wrapped' });
    });
  });

  describe('Given a result that has a "message" property but no "data"', () => {
    it('Then it includes the message in the envelope and uses the result as data', async () => {
      const value = { message: 'Signed out', extraField: true };
      const result = await intercept(value);
      // message extracted, whole object used as data (no "data" key present)
      expect(result.success).toBe(true);
      expect(result.message).toBe('Signed out');
      expect(result.data).toEqual({ message: 'Signed out', extraField: true });
    });
  });

  describe('Given a result that has both "message" and "data" properties', () => {
    it('Then it extracts the data field and includes the message separately', async () => {
      const value = { message: 'Created', data: { id: 1 } };
      const result = await intercept(value);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Created');
      expect(result.data).toEqual({ id: 1 });
    });
  });

  describe('Given a result with a message of undefined', () => {
    it('Then the message key is omitted from the envelope', async () => {
      const result = await intercept({ id: 42 });
      expect('message' in result).toBe(false);
    });
  });
});
