import { Controller, Get, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserFacade } from '@user/infrastructure/facade/user.facade';
import { GetMeOutDto } from '@user/infrastructure/controllers/get-me/get-me-out.dto';

@ApiTags('Users')
@Controller('users')
export class GetMeController {
  constructor(private readonly userFacade: UserFacade) {}

  @Get('me')
  @UseGuards(JwtAuthenticationGuard)
  @ApiBearerAuth('JWT-authentication')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current authenticated user',
    type: GetMeOutDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async handle(@CurrentUser('uuid') uuid: string): Promise<GetMeOutDto> {
    const result = await this.userFacade.findUserByUUIDWithCredential(uuid);

    if (!result) {
      throw new NotFoundException('User not found');
    }

    const { user, credential } = result;
    const username = (await this.userFacade.findUsernameByUUID(uuid)) ?? credential.email;
    const displayName = await this.userFacade.findDisplayNameByUserUUID(uuid);

    return {
      id: user.uuid,
      email: credential.email,
      username,
      displayName,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
