import { Controller, Post, Body, Req, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Secure } from '@common/decorators/secure.decorator';
import { ResendVerificationCodeCommand } from '@authentication/application/commands/resend-verification-code/resend-verification-code.command';
import { ResendVerificationCodeCommandResult } from '@authentication/application/types/authentication-result.types';
import { ResendVerificationCodeInDto } from '@authentication/infrastructure/controllers/resend-verification-code/resend-verification-code-in.dto';
import { ResendVerificationCodeOutDto } from '@authentication/infrastructure/controllers/resend-verification-code/resend-verification-code-out.dto';
import { extractLocale } from '@shared/infrastructure/i18n/locale.helper';
import { mapDomainErrorToHttp } from '@shared/infrastructure/http/domain-error-mapper';

@ApiTags('Authentication')
@Controller('authentication')
export class ResendVerificationCodeController {
  constructor(private readonly commandBus: CommandBus) {}

  @Throttle({ short: { ttl: 1000, limit: 1 }, medium: { ttl: 60000, limit: 3 } })
  @Post('resend-verification-code')
  @Secure()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification code' })
  @ApiResponse({
    status: 200,
    description: 'Verification code resent successfully',
    type: ResendVerificationCodeOutDto,
  })
  @ApiResponse({ status: 400, description: 'User already verified' })
  @ApiResponse({ status: 429, description: 'Cooldown active or max resends exceeded' })
  async handle(
    @Body() dto: ResendVerificationCodeInDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ResendVerificationCodeOutDto> {
    const ipAddress = this.getClientIp(req);
    const lang = extractLocale(req.headers as Record<string, string | string[] | undefined>);

    const result = await this.commandBus.execute<
      ResendVerificationCodeCommand,
      ResendVerificationCodeCommandResult
    >(new ResendVerificationCodeCommand(dto.email, ipAddress, userAgent, lang));

    return result.match(
      (data) => ({
        success: data.success,
        message: data.message,
        cooldownSeconds: data.cooldownSeconds,
        remainingResends: data.remainingResends,
      }),
      (error) => {
        throw mapDomainErrorToHttp(error);
      },
    );
  }

  /* istanbul ignore next */
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return req.ip || req.socket.remoteAddress || '0.0.0.0';
  }
}
