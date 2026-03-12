import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  backoffMs: number;
}

export interface RetryLogContext {
  handler: string;
  event: string;
}

export class RetryExhaustedException extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lastError: Error,
    public readonly context: RetryLogContext,
  ) {
    super(
      `Retry exhausted after ${attempts} attempts in ${context.handler} handling ${context.event}: ${lastError.message}`,
    );
    this.name = 'RetryExhaustedException';
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes an async operation with exponential backoff retry.
 *
 * @param operation  - The async function to retry.
 * @param options    - maxAttempts and initial backoffMs.
 * @param logger     - NestJS Logger instance for structured logging.
 * @param logContext - handler and event names for log correlation.
 * @returns The result of the operation if it succeeds within maxAttempts.
 * @throws RetryExhaustedException if all attempts are exhausted.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  logger: Logger,
  logContext: RetryLogContext,
): Promise<T> {
  let lastError = new Error('withRetry: no attempts executed');

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < options.maxAttempts) {
        const waitMs = options.backoffMs * Math.pow(2, attempt - 1);
        logger.warn(
          `[${logContext.handler}] Attempt ${attempt}/${options.maxAttempts} failed for ${logContext.event}: ${lastError.message}. Retrying in ${waitMs}ms...`,
        );

        await delay(waitMs);
      }
    }
  }

  logger.error(
    `[${logContext.handler}] All ${options.maxAttempts} attempts exhausted for ${logContext.event}: ${lastError.message}`,
  );

  throw new RetryExhaustedException(options.maxAttempts, lastError, logContext);
}
