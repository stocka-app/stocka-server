import { Controller, Post, Body, Req, Headers } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { ResendVerificationCodeCommand } from '@auth/application/commands/resend-verification-code/resend-verification-code.command';
import { ResendVerificationCodeInDto } from '@auth/infrastructure/controllers/resend-verification-code/resend-verification-code-in.dto';
import { ResendVerificationCodeOutDto } from '@auth/infrastructure/controllers/resend-verification-code/resend-verification-code-out.dto';
import { extractLocale } from '@shared/infrastructure/i18n/locale.helper';

@ApiTags('Auth')
@Controller('auth')
export class ResendVerificationCodeController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('resend-verification-code')
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
      { success: boolean; message: string; cooldownSeconds?: number; remainingResends?: number }
    >(new ResendVerificationCodeCommand(dto.email, ipAddress, userAgent, lang));

    return {
      success: result.success,
      message: result.message,
      cooldownSeconds: result.cooldownSeconds,
      remainingResends: result.remainingResends,
    };
  }

  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return req.ip || req.socket.remoteAddress || '0.0.0.0';
  }
}
