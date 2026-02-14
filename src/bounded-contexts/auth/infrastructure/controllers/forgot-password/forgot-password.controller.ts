import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RateLimit } from '@common/decorators/rate-limit.decorator';
import { ForgotPasswordCommand } from '@auth/application/commands/forgot-password/forgot-password.command';
import { ForgotPasswordResult } from '@auth/application/types/auth-result.types';
import { ForgotPasswordInDto } from '@auth/infrastructure/controllers/forgot-password/forgot-password-in.dto';

@ApiTags('Auth')
@Controller('auth')
export class ForgotPasswordController {
  constructor(private readonly commandBus: CommandBus) {}

  @Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 3 },
  })
  @RateLimit({
    type: 'forgot_password',
    maxAttemptsByIp: 10,
    maxAttemptsByIdentifier: 3,
    identifierSource: 'body.email',
    trackFailedAttempts: false,
    failureErrorCodes: [],
  })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({
    status: 200,
    description: 'If account exists, reset email will be sent',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async handle(@Body() dto: ForgotPasswordInDto): Promise<{ message: string }> {
    const result = await this.commandBus.execute<ForgotPasswordCommand, ForgotPasswordResult>(
      new ForgotPasswordCommand(dto.email),
    );

    return { message: result.message };
  }
}
