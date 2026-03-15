import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { DomainExceptionFilter } from '@common/filters/domain-exception.filter';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

function createMockHost(status?: jest.Mock): ArgumentsHost {
  const json = jest.fn();
  const mockStatus = status ?? jest.fn().mockReturnValue({ json });
  const response = { status: mockStatus, json };

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue(response),
      getRequest: jest.fn().mockReturnValue({}),
    }),
  } as unknown as ArgumentsHost;
}

// ─── AllExceptionsFilter ──────────────────────────────────────────────────────
describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  describe('Given an unhandled Error exception', () => {
    describe('When catch() is called', () => {
      it('Then it responds with 500 and INTERNAL_SERVER_ERROR body', () => {
        const json = jest.fn();
        const mockResponse = { status: jest.fn().mockReturnValue({ json }), json };
        const host = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as unknown as ArgumentsHost;

        filter.catch(new Error('Unexpected failure'), host);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'INTERNAL_SERVER_ERROR',
          }),
        );
      });
    });
  });

  describe('Given an unhandled non-Error exception', () => {
    describe('When catch() is called with a plain string', () => {
      it('Then it still responds with 500', () => {
        const json = jest.fn();
        const mockResponse = { status: jest.fn().mockReturnValue({ json }), json };
        const host = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as unknown as ArgumentsHost;

        filter.catch('something unexpected', host);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      });
    });
  });
});

// ─── DomainExceptionFilter ────────────────────────────────────────────────────
describe('DomainExceptionFilter', () => {
  let filter: DomainExceptionFilter;

  beforeEach(() => {
    filter = new DomainExceptionFilter();
  });

  describe('Given a DomainException', () => {
    describe('When catch() is called', () => {
      it('Then it maps the exception to an HTTP response', () => {
        const json = jest.fn();
        const mockStatus = jest.fn().mockReturnValue({ json });
        const mockResponse = { status: mockStatus };
        const host = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as unknown as ArgumentsHost;

        class TestDomainException extends DomainException {
          constructor() {
            super('Test domain error', 'TEST_ERROR', [{ field: 'test', message: 'error' }]);
          }
        }

        filter.catch(new TestDomainException(), host);

        expect(mockStatus).toHaveBeenCalled();
        expect(json).toHaveBeenCalled();
      });
    });
  });
});

// ─── HttpExceptionFilter ──────────────────────────────────────────────────────
describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  describe('Given an HttpException with a string response', () => {
    describe('When catch() is called', () => {
      it('Then it responds with the correct status and message', () => {
        const json = jest.fn();
        const mockStatus = jest.fn().mockReturnValue({ json });
        const mockResponse = { status: mockStatus };
        const host = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as unknown as ArgumentsHost;

        const exception = new HttpException('Not found here', HttpStatus.NOT_FOUND);
        filter.catch(exception, host);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
        expect(json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Not found here',
          }),
        );
      });
    });
  });

  describe('Given an HttpException with an object response', () => {
    describe('When the message is a string', () => {
      it('Then it uses the string message', () => {
        const json = jest.fn();
        const mockStatus = jest.fn().mockReturnValue({ json });
        const mockResponse = { status: mockStatus };
        const host = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as unknown as ArgumentsHost;

        const exception = new HttpException(
          { message: 'Custom message', error: 'CUSTOM_ERROR', statusCode: 400 },
          HttpStatus.BAD_REQUEST,
        );
        filter.catch(exception, host);

        expect(json).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Custom message', error: 'CUSTOM_ERROR' }),
        );
      });
    });

    describe('When the message is an array (class-validator errors)', () => {
      it('Then it picks the first message and includes details', () => {
        const json = jest.fn();
        const mockStatus = jest.fn().mockReturnValue({ json });
        const mockResponse = { status: mockStatus };
        const host = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as unknown as ArgumentsHost;

        const exception = new HttpException(
          {
            message: ['email must be an email', 'password is too short'],
            error: 'VALIDATION_ERROR',
            statusCode: 400,
          },
          HttpStatus.BAD_REQUEST,
        );
        filter.catch(exception, host);

        const body = json.mock.calls[0][0] as Record<string, unknown>;
        expect(body.message).toBe('email must be an email');
        expect(Array.isArray(body.details)).toBe(true);
      });
    });

    describe('When the response includes details', () => {
      it('Then it passes the details through to the response', () => {
        const json = jest.fn();
        const mockStatus = jest.fn().mockReturnValue({ json });
        const mockResponse = { status: mockStatus };
        const host = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as unknown as ArgumentsHost;

        const exception = new HttpException(
          {
            message: 'Validation failed',
            error: 'VALIDATION_ERROR',
            statusCode: 422,
            details: [{ field: 'email', message: 'invalid' }],
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        filter.catch(exception, host);

        const body = json.mock.calls[0][0] as Record<string, unknown>;
        expect(body.details).toEqual([{ field: 'email', message: 'invalid' }]);
      });
    });

    describe('When the message array is empty', () => {
      it('Then it uses the Validation failed fallback', () => {
        const json = jest.fn();
        const mockStatus = jest.fn().mockReturnValue({ json });
        const mockResponse = { status: mockStatus };
        const host = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as unknown as ArgumentsHost;

        const exception = new HttpException(
          { message: [], error: 'VALIDATION_ERROR', statusCode: 400 },
          HttpStatus.BAD_REQUEST,
        );
        filter.catch(exception, host);

        const body = json.mock.calls[0][0] as Record<string, unknown>;
        expect(body.message).toBe('Validation failed');
      });
    });

    describe('When the response has no message field', () => {
      it('Then it falls back to "An error occurred"', () => {
        const json = jest.fn();
        const mockStatus = jest.fn().mockReturnValue({ json });
        const mockResponse = { status: mockStatus };
        const host = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as unknown as ArgumentsHost;

        const exception = new HttpException(
          { statusCode: 400 } as Record<string, unknown>,
          HttpStatus.BAD_REQUEST,
        );
        filter.catch(exception, host);

        const body = json.mock.calls[0][0] as Record<string, unknown>;
        expect(body.message).toBe('An error occurred');
      });
    });

    describe('When the response has no error field and status has no HttpStatus mapping', () => {
      it('Then it falls back to "ERROR"', () => {
        const json = jest.fn();
        const mockStatus = jest.fn().mockReturnValue({ json });
        const mockResponse = { status: mockStatus };
        const host = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as unknown as ArgumentsHost;

        // Use a non-standard HTTP status that has no HttpStatus enum entry
        const exception = new HttpException(
          { message: 'custom', statusCode: 499 },
          499 as unknown as HttpStatus,
        );
        filter.catch(exception, host);

        const body = json.mock.calls[0][0] as Record<string, unknown>;
        expect(body.error).toBe('ERROR');
      });
    });

    describe('When the string response has a non-standard status code', () => {
      it('Then error falls back to "ERROR" when HttpStatus has no mapping', () => {
        const json = jest.fn();
        const mockStatus = jest.fn().mockReturnValue({ json });
        const mockResponse = { status: mockStatus };
        const host = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
          }),
        } as unknown as ArgumentsHost;

        const exception = new HttpException('Custom string error', 499 as unknown as HttpStatus);
        filter.catch(exception, host);

        const body = json.mock.calls[0][0] as Record<string, unknown>;
        expect(body.error).toBe('ERROR');
        expect(body.message).toBe('Custom string error');
      });
    });
  });
});
