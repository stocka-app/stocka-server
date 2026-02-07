import { Controller, Post, Body, Req, Headers } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { VerifyEmailCommand } from '@/auth/application/commands/verify-email/verify-email.command';
import { VerifyEmailInDto } from '@/auth/infrastructure/controllers/verify-email/verify-email-in.dto';
import { VerifyEmailOutDto } from '@/auth/infrastructure/controllers/verify-email/verify-email-out.dto';

@ApiTags('Auth')
@Controller('auth')
export class VerifyEmailController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email with code' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: VerifyEmailOutDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
  @ApiResponse({ status: 429, description: 'Too many attempts or rate limit exceeded' })
  async handle(
    @Body() dto: VerifyEmailInDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent?: string,
  ): Promise<VerifyEmailOutDto> {
    const ipAddress = this.getClientIp(req);

    const result = await this.commandBus.execute<
      VerifyEmailCommand,
      { success: boolean; message: string }
    >(new VerifyEmailCommand(dto.email, dto.code, ipAddress, userAgent));

    return {
      success: result.success,
      message: result.message,
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
