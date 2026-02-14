import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { FindUserByUuidQuery } from '@user/application/queries/find-user-by-uuid/find-user-by-uuid.query';
import { UserModel } from '@user/domain/models/user.model';
import { GetMeOutDto } from '@user/infrastructure/controllers/get-me/get-me-out.dto';

@ApiTags('Auth')
@Controller('auth')
export class GetMeController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current authenticated user',
    type: GetMeOutDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handle(@CurrentUser('uuid') uuid: string): Promise<GetMeOutDto> {
    const user: UserModel = await this.queryBus.execute(new FindUserByUuidQuery(uuid));

    return {
      id: user.uuid,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
