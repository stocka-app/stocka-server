import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request } from 'express';
import { RateLimitConfig } from '@common/decorators/rate-limit.decorator';
import { IVerificationAttemptContract } from '@authentication/domain/contracts/verification-attempt.contract';
import { VerificationAttemptModel } from '@authentication/domain/models/verification-attempt.model';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { UserVerificationBlockedByAuthenticationEvent } from '@shared/domain/events/integration';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { EMAIL_PATTERN } from '@common/constants/validation.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

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
    private readonly eventBus: EventBus,
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
    if (!config?.trackFailedAttempts) {
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
    let userResult: { user: UserAggregate; credential: CredentialAccountModel } | null = null;
    if (identifier) {
      try {
        userResult = await this.mediator.user.findUserByEmailOrUsername(identifier);
      } catch {
        // User not found — track by IP only
      }
    }

    // Persist failed attempt
    if (userResult) {
      const { user, credential } = userResult;
      const attempt = VerificationAttemptModel.create({
        userUUID: user.uuid,
        email: credential.email,
        ipAddress: ip,
        userAgent: request.headers['user-agent'] || null,
        codeEntered: null,
        success: false,
        verificationType: config.type,
      });
      await this.attemptContract.persist(attempt);

      // Check progressive blocking
      if (config.progressiveBlock) {
        const totalFailed = await this.attemptContract.countFailedByUserUUIDInLastHourByType(
          user.uuid,
          config.type,
        );

        this.evaluateBlock(user, totalFailed, config);
      }
    } else {
      // Track failed attempt by IP only (no user found)
      // Only set email if identifier has valid email format (could be username)
      const emailValue = identifier && this.isValidEmail(identifier) ? identifier : null;

      const attempt = VerificationAttemptModel.create({
        userUUID: null,
        email: emailValue,
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
        `identifier=${identifier || 'unknown'} | userExists=${!!userResult}`,
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

  private isValidEmail(value: string): boolean {
    return EMAIL_PATTERN.test(value);
  }

  private evaluateBlock(user: UserAggregate, failedAttempts: number, config: RateLimitConfig): void {
    if (!config.progressiveBlock) return;

    // Find the highest matching threshold
    const sortedThresholds = [...config.progressiveBlock.thresholds].sort(
      (a, b) => b.attempts - a.attempts,
    );

    for (const threshold of sortedThresholds) {
      if (failedAttempts >= threshold.attempts) {
        const blockedUntil = new Date(Date.now() + threshold.blockMinutes * 60 * 1000);

        this.eventBus.publish(
          new UserVerificationBlockedByAuthenticationEvent(user.uuid, blockedUntil),
        );

        this.logger.warn(
          `Account blocked | userUUID=${user.uuid} | ` +
            `attempts=${failedAttempts} | blockedMinutes=${threshold.blockMinutes}`,
        );
        break;
      }
    }
  }
}
