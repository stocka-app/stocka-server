import { Controller, Post, Body } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SignUpCommand } from '@/auth/application/commands/sign-up/sign-up.command';
import { SignUpInDto } from '@/auth/infrastructure/controllers/sign-up/sign-up-in.dto';
import {
  SignUpOutDto,
  UserOutDto,
} from '@/auth/infrastructure/controllers/sign-up/sign-up-out.dto';
import { UserModel } from '@/user/domain/models/user.model';

interface SignUpResult {
  user: UserModel;
  accessToken: string;
  refreshToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class SignUpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: SignUpOutDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async handle(@Body() dto: SignUpInDto): Promise<SignUpOutDto> {
    const result: SignUpResult = await this.commandBus.execute(
      new SignUpCommand(dto.email, dto.username, dto.password),
    );

    const userOut: UserOutDto = {
      id: result.user.uuid,
      email: result.user.email,
      username: result.user.username,
      createdAt: result.user.createdAt.toISOString(),
    };

    return {
      user: userOut,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }
}
