import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitThreshold {
  attempts: number;
  blockMinutes: number;
}

export interface RateLimitConfig {
  type: string;
  maxAttemptsByIp: number;
  maxAttemptsByIdentifier?: number;
  identifierSource?: string;
  trackFailedAttempts: boolean;
  progressiveBlock?: {
    thresholds: RateLimitThreshold[];
  };
  failureErrorCodes: string[];
}

export const RateLimit = (config: RateLimitConfig): ReturnType<typeof SetMetadata> =>
  SetMetadata(RATE_LIMIT_KEY, config);
