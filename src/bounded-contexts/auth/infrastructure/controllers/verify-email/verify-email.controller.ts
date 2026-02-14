import { Controller, Post, Body } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { VerifyEmailCommand } from '@/auth/application/commands/verify-email/verify-email.command';
import { VerifyEmailInDto } from '@/auth/infrastructure/controllers/verify-email/verify-email-in.dto';
import { VerifyEmailOutDto } from '@/auth/infrastructure/controllers/verify-email/verify-email-out.dto';

@ApiTags('Auth')
@Controller('auth')
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
  async handle(@Body() dto: VerifyEmailInDto): Promise<VerifyEmailOutDto> {
    const result = await this.commandBus.execute<
      VerifyEmailCommand,
      { success: boolean; message: string }
    >(new VerifyEmailCommand(dto.email, dto.code));

    return {
      success: result.success,
      message: result.message,
    };
  }
}
