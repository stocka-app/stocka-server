import { Logger } from '@nestjs/common';
import {
  withRetry,
  RetryExhaustedException,
  RetryLogContext,
} from '@shared/domain/utils/with-retry';

describe('withRetry', () => {
  let logger: jest.Mocked<Logger>;
  const logContext: RetryLogContext = {
    handler: 'TestHandler',
    event: 'TestEvent',
  };

  beforeEach(() => {
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Given an operation that succeeds on first attempt', () => {
    it('should return the result without retrying', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      jest.useRealTimers();
      const result = await withRetry(
        operation,
        { maxAttempts: 3, backoffMs: 100 },
        logger,
        logContext,
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Given an operation that fails then succeeds', () => {
    it('should retry and return the result on success', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('transient error'))
        .mockResolvedValue('success');

      jest.useRealTimers();
      const result = await withRetry(
        operation,
        { maxAttempts: 3, backoffMs: 10 },
        logger,
        logContext,
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Attempt 1/3 failed'));
    });
  });

  describe('Given an operation that always fails', () => {
    it('should exhaust all attempts and throw RetryExhaustedException', async () => {
      const lastError = new Error('persistent error');
      const operation = jest.fn().mockRejectedValue(lastError);

      jest.useRealTimers();
      await expect(
        withRetry(operation, { maxAttempts: 3, backoffMs: 10 }, logger, logContext),
      ).rejects.toThrow(RetryExhaustedException);

      expect(operation).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2); // attempts 1 and 2
      expect(logger.error).toHaveBeenCalledTimes(1); // final exhaustion
    });

    it('should include attempts, lastError, and context in RetryExhaustedException', async () => {
      const lastError = new Error('persistent error');
      const operation = jest.fn().mockRejectedValue(lastError);

      jest.useRealTimers();
      try {
        await withRetry(operation, { maxAttempts: 2, backoffMs: 10 }, logger, logContext);
        fail('Expected RetryExhaustedException');
      } catch (error) {
        expect(error).toBeInstanceOf(RetryExhaustedException);
        const retryError = error as RetryExhaustedException;
        expect(retryError.attempts).toBe(2);
        expect(retryError.lastError).toBe(lastError);
        expect(retryError.context).toEqual(logContext);
      }
    });
  });

  describe('Given maxAttempts = 1', () => {
    it('should not retry and throw on first failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('immediate failure'));

      jest.useRealTimers();
      await expect(
        withRetry(operation, { maxAttempts: 1, backoffMs: 10 }, logger, logContext),
      ).rejects.toThrow(RetryExhaustedException);

      expect(operation).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled(); // no retry = no warn
    });
  });

  describe('Given a non-Error throw', () => {
    it('should wrap string errors into Error objects', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      jest.useRealTimers();
      try {
        await withRetry(operation, { maxAttempts: 1, backoffMs: 10 }, logger, logContext);
        fail('Expected RetryExhaustedException');
      } catch (error) {
        expect(error).toBeInstanceOf(RetryExhaustedException);
        const retryError = error as RetryExhaustedException;
        expect(retryError.lastError).toBeInstanceOf(Error);
        expect(retryError.lastError.message).toBe('string error');
      }
    });
  });

  describe('Exponential backoff', () => {
    it('should use exponential delays between retries', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValue('success');

      jest.useRealTimers();
      const result = await withRetry(
        operation,
        { maxAttempts: 3, backoffMs: 10 },
        logger,
        logContext,
      );

      expect(result).toBe('success');
      // Attempt 1 fails → delay 10ms (10 * 2^0)
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Retrying in 10ms'));
      // Attempt 2 fails → delay 20ms (10 * 2^1)
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Retrying in 20ms'));
    });
  });
});
