import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request } from 'express';
import { RateLimitConfig } from '@common/decorators/rate-limit.decorator';
import { IVerificationAttemptContract } from '@auth/domain/contracts/verification-attempt.contract';
import { VerificationAttemptModel } from '@auth/domain/models/verification-attempt.model';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserModel } from '@user/domain/models/user.model';

interface HttpErrorResponse {
  error?: string;
}

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RateLimit');

  constructor(
    @Inject(INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT)
    private readonly attemptContract: IVerificationAttemptContract,
    private readonly mediator: MediatorService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        // Handle async error processing
        return new Observable((subscriber) => {
          this.handleError(context, error)
            .then(() => {
              subscriber.error(error);
            })
            .catch(() => {
              subscriber.error(error);
            });
        });
      }),
    );
  }

  private async handleError(context: ExecutionContext, error: unknown): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const config: RateLimitConfig | undefined = request.__rateLimitConfig;

    // No rate limit config or not tracking → just re-throw
    if (!config || !config.trackFailedAttempts) {
      return;
    }

    // Check if this error is a "failure" we should track
    const errorCode = this.extractErrorCode(error);

    if (!errorCode || !config.failureErrorCodes.includes(errorCode)) {
      return;
    }

    const ip: string = request.__clientIp || '0.0.0.0';
    const identifier: string | undefined = request.__rateLimitIdentifier;

    // Try to find user for tracking
    let user: UserModel | null = null;
    if (identifier) {
      try {
        user = (await this.mediator.findUserByEmailOrUsername(identifier)) as UserModel | null;
      } catch {
        // User not found — track by IP only
      }
    }

    // Persist failed attempt
    if (user) {
      const attempt = VerificationAttemptModel.create({
        userUuid: user.uuid,
        email: user.email,
        ipAddress: ip,
        userAgent: request.headers['user-agent'] || null,
        codeEntered: null,
        success: false,
        verificationType: config.type,
      });
      await this.attemptContract.persist(attempt);

      // Check progressive blocking
      if (config.progressiveBlock) {
        const totalFailed = await this.attemptContract.countFailedByUserUuidInLastHourByType(
          user.uuid,
          config.type,
        );

        await this.evaluateBlock(user, totalFailed, config);
      }
    } else {
      // Track failed attempt by IP only (no user found)
      const attempt = VerificationAttemptModel.create({
        userUuid: null,
        email: identifier || null,
        ipAddress: ip,
        userAgent: request.headers['user-agent'] || null,
        codeEntered: null,
        success: false,
        verificationType: config.type,
      });

      await this.attemptContract.persist(attempt);
    }

    this.logger.warn(
      `Failed attempt tracked | type=${config.type} | ip=${ip} | ` +
        `identifier=${identifier || 'unknown'} | userExists=${!!user}`,
    );
  }

  private extractErrorCode(error: unknown): string | null {
    if (error instanceof DomainException) {
      return error.errorCode;
    }

    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: HttpErrorResponse }).response;
      if (response && typeof response.error === 'string') {
        return response.error;
      }
    }

    return null;
  }

  private async evaluateBlock(
    user: UserModel,
    failedAttempts: number,
    config: RateLimitConfig,
  ): Promise<void> {
    if (!config.progressiveBlock) return;

    // Find the highest matching threshold
    const sortedThresholds = [...config.progressiveBlock.thresholds].sort(
      (a, b) => b.attempts - a.attempts,
    );

    for (const threshold of sortedThresholds) {
      if (failedAttempts >= threshold.attempts) {
        const blockedUntil = new Date(Date.now() + threshold.blockMinutes * 60 * 1000);

        await this.mediator.blockUserVerification(user.uuid, blockedUntil);

        this.logger.warn(
          `Account blocked | userUuid=${user.uuid} | ` +
            `attempts=${failedAttempts} | blockedMinutes=${threshold.blockMinutes}`,
        );
        break;
      }
    }
  }
}
