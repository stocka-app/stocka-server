import { Controller, Post, Body, Req } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { RateLimit } from '@common/decorators/rate-limit.decorator';
import { VerifyEmailCommand } from '@authentication/application/commands/verify-email/verify-email.command';
import { VerifyEmailCommandResult } from '@authentication/application/types/authentication-result.types';
import { VerifyEmailInDto } from '@authentication/infrastructure/controllers/verify-email/verify-email-in.dto';
import { VerifyEmailOutDto } from '@authentication/infrastructure/controllers/verify-email/verify-email-out.dto';
import { extractLocale } from '@shared/infrastructure/i18n/locale.helper';
import { mapDomainErrorToHttp } from '@shared/infrastructure/http/domain-error-mapper';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@ApiTags('Authentication')
@Controller('authentication')
export class VerifyEmailController {
  constructor(private readonly commandBus: CommandBus) {}

  @Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 10 },
  })
  @RateLimit({
    type: 'email_verification',
    maxAttemptsByIp: 20,
    maxAttemptsByIdentifier: 10,
    identifierSource: 'body.email',
    trackFailedAttempts: true,
    progressiveBlock: {
      thresholds: [
        { attempts: 5, blockMinutes: 5 },
        { attempts: 10, blockMinutes: 30 },
        { attempts: 20, blockMinutes: 1440 },
      ],
    },
    failureErrorCodes: ['INVALID_VERIFICATION_CODE'],
  })
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email with code' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: VerifyEmailOutDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
  @ApiResponse({ status: 429, description: 'Too many attempts or rate limit exceeded' })
  async handle(@Body() dto: VerifyEmailInDto, @Req() req: Request): Promise<VerifyEmailOutDto> {
    const lang = extractLocale(req.headers as Record<string, string | string[] | undefined>);

    const result = await this.commandBus.execute<VerifyEmailCommand, VerifyEmailCommandResult>(
      new VerifyEmailCommand(dto.email, dto.code, lang),
    );

    return result.match(
      (data) => ({
        success: data.success,
        message: data.message,
      }),
      (error: DomainException) => {
        throw mapDomainErrorToHttp(error);
      },
    );
  }
}
