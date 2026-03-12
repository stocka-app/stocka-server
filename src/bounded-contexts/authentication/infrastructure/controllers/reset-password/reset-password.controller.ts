import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResetPasswordCommand } from '@authentication/application/commands/reset-password/reset-password.command';
import { ResetPasswordCommandResult } from '@authentication/application/types/authentication-result.types';
import { ResetPasswordInDto } from '@authentication/infrastructure/controllers/reset-password/reset-password-in.dto';
import { mapDomainErrorToHttp } from '@shared/infrastructure/http/domain-error-mapper';

@ApiTags('Authentication')
@Controller('authentication')
export class ResetPasswordController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({
    status: 200,
    description: 'Password successfully reset',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Token expired or invalid' })
  async handle(@Body() dto: ResetPasswordInDto): Promise<{ message: string }> {
    const result = await this.commandBus.execute<ResetPasswordCommand, ResetPasswordCommandResult>(
      new ResetPasswordCommand(dto.token, dto.newPassword),
    );

    return result.match(
      (data) => ({ message: data.message }),
      (error) => {
        throw mapDomainErrorToHttp(error);
      },
    );
  }
}
