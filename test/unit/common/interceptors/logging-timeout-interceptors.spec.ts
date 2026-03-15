import { ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { TimeoutError } from 'rxjs';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from '@common/interceptors/timeout.interceptor';

function createMockExecutionContext(
  method = 'GET',
  url = '/api/health',
  statusCode = 200,
): ExecutionContext {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        method,
        originalUrl: url,
      }),
      getResponse: jest.fn().mockReturnValue({
        statusCode,
      }),
    }),
  } as unknown as ExecutionContext;
}

// ─── LoggingInterceptor ───────────────────────────────────────────────────────
describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  describe('Given a successful request', () => {
    describe('When intercept() is called', () => {
      it('Then it returns an Observable that emits the original value', (done) => {
        const context = createMockExecutionContext();
        const mockNext: CallHandler = {
          handle: (): Observable<unknown> => of({ data: 'response-data' }),
        };

        const result = interceptor.intercept(context, mockNext);
        result.subscribe({
          next: (value) => {
            expect(value).toEqual({ data: 'response-data' });
            done();
          },
        });
      });
    });
  });

  describe('Given multiple different request methods', () => {
    describe('When intercept() is called for a POST request', () => {
      it('Then it handles the request without error', (done) => {
        const context = createMockExecutionContext('POST', '/api/auth/sign-up', 201);
        const mockNext: CallHandler = {
          handle: (): Observable<unknown> => of(null),
        };

        const result = interceptor.intercept(context, mockNext);
        result.subscribe({
          next: () => done(),
          error: done,
        });
      });
    });
  });
});

// ─── TimeoutInterceptor ───────────────────────────────────────────────────────
describe('TimeoutInterceptor', () => {
  let interceptor: TimeoutInterceptor;

  beforeEach(() => {
    interceptor = new TimeoutInterceptor();
  });

  describe('Given a request that completes within the timeout', () => {
    describe('When intercept() is called', () => {
      it('Then it returns the response value', (done) => {
        const context = createMockExecutionContext();
        const mockNext: CallHandler = {
          handle: (): Observable<unknown> => of('quick-response'),
        };

        const result = interceptor.intercept(context, mockNext);
        result.subscribe({
          next: (value) => {
            expect(value).toBe('quick-response');
            done();
          },
          error: done,
        });
      });
    });
  });

  describe('Given a request that triggers a TimeoutError', () => {
    describe('When the request exceeds the allowed time', () => {
      it('Then it converts the error to RequestTimeoutException', (done) => {
        const context = createMockExecutionContext();
        const mockNext: CallHandler = {
          handle: (): Observable<unknown> => throwError(() => new TimeoutError()),
        };

        const result = interceptor.intercept(context, mockNext);
        result.subscribe({
          error: (err: unknown) => {
            expect(err).toBeInstanceOf(RequestTimeoutException);
            done();
          },
        });
      });
    });
  });

  describe('Given a request that throws a non-timeout error', () => {
    describe('When the handler emits a non-timeout error', () => {
      it('Then it re-throws the original error', (done) => {
        const context = createMockExecutionContext();
        const originalError = new Error('Something went wrong');
        const mockNext: CallHandler = {
          handle: (): Observable<unknown> => throwError(() => originalError),
        };

        const result = interceptor.intercept(context, mockNext);
        result.subscribe({
          error: (err: unknown) => {
            expect(err).toBe(originalError);
            done();
          },
        });
      });
    });
  });
});
