import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SignOutCommand } from '@auth/application/commands/sign-out/sign-out.command';
import { SignOutInDto } from '@auth/infrastructure/controllers/sign-out/sign-out-in.dto';

@ApiTags('Auth')
@Controller('auth')
export class SignOutController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out and invalidate all sessions' })
  @ApiResponse({
    status: 200,
    description: 'User successfully signed out',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async handle(@Body() dto: SignOutInDto): Promise<{ message: string }> {
    await this.commandBus.execute(new SignOutCommand(dto.refreshToken));

    return { message: 'Successfully signed out' };
  }
}
