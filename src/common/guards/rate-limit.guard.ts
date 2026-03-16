import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RATE_LIMIT_KEY, RateLimitConfig } from '@common/decorators/rate-limit.decorator';
import { IVerificationAttemptContract } from '@authentication/domain/contracts/verification-attempt.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

// Extend Request type to include rate limit properties
declare module 'express' {
  interface Request {
    __rateLimitConfig?: RateLimitConfig;
    __clientIp?: string;
    __rateLimitIdentifier?: string;
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger('RateLimit');

  constructor(
    private readonly reflector: Reflector,
    @Inject(INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT)
    private readonly attemptContract: IVerificationAttemptContract,
    private readonly mediator: MediatorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<RateLimitConfig | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!config) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.extractIp(request);

    // Attach config and ip to request for RateLimitInterceptor
    request.__rateLimitConfig = config;
    request.__clientIp = ip;

    // Check IP rate limit
    const ipAttempts = await this.attemptContract.countFailedByIpAddressInLastHourByType(
      ip,
      config.type,
    );

    if (ipAttempts >= config.maxAttemptsByIp) {
      this.logger.warn(
        `IP rate limit exceeded | ip=${ip} | type=${config.type} | attempts=${ipAttempts}`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many attempts from this IP address. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check identifier rate limit (if configured)
    if (config.maxAttemptsByIdentifier && config.identifierSource) {
      const identifier = this.extractIdentifier(request, config.identifierSource);

      if (identifier) {
        request.__rateLimitIdentifier = identifier;

        const identifierAttempts =
          await this.attemptContract.countFailedByIdentifierInLastHourByType(
            identifier,
            config.type,
          );

        if (identifierAttempts >= config.maxAttemptsByIdentifier) {
          this.logger.warn(
            `Identifier rate limit exceeded | identifier=${identifier} | type=${config.type} | attempts=${identifierAttempts}`,
          );
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Too many attempts. Please try again later.',
              error: 'RATE_LIMIT_EXCEEDED',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        // Check progressive block (if user exists)
        if (config.progressiveBlock) {
          await this.checkAccountBlock(identifier);
        }
      }
    }

    return true;
  }

  private async checkAccountBlock(identifier: string): Promise<void> {
    try {
      const result = await this.mediator.user.findUserByEmailOrUsername(identifier);
      const credential = result?.credential;

      if (
        credential?.verificationBlockedUntil &&
        credential.verificationBlockedUntil > new Date()
      ) {
        const minutesRemaining = Math.ceil(
          (credential.verificationBlockedUntil.getTime() - Date.now()) / 60000,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Account temporarily locked. Try again in ${minutesRemaining} minute(s).`,
            error: 'ACCOUNT_TEMPORARILY_LOCKED',
            blockedUntil: credential.verificationBlockedUntil.toISOString(),
            minutesRemaining,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // User not found — no block check needed, continue
    }
  }

  private extractIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return request.ip || request.socket.remoteAddress || '0.0.0.0';
  }

  private extractIdentifier(request: Request, source: string): string | null {
    // source format: 'body.emailOrUsername' or 'body.email'
    const parts = source.split('.');
    let value: unknown = request;

    for (const part of parts) {
      value = (value as Record<string, unknown>)?.[part];
    }

    return typeof value === 'string' ? value : null;
  }
}
