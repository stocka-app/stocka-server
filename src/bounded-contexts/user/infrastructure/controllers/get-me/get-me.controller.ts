import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import {
  FindUserByUUIDQuery,
  FindUserByUUIDQueryResult,
} from '@user/application/queries/find-user-by-uuid/find-user-by-uuid.query';
import { GetMeOutDto } from '@user/infrastructure/controllers/get-me/get-me-out.dto';
import { mapDomainErrorToHttp } from '@shared/infrastructure/http/domain-error-mapper';

@ApiTags('Authentication')
@Controller('authentication')
export class GetMeController {
  constructor(private readonly queryBus: QueryBus) {}

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
    const result = await this.queryBus.execute<FindUserByUUIDQuery, FindUserByUUIDQueryResult>(
      new FindUserByUUIDQuery(uuid),
    );

    return result.match(
      (user) => ({
        id: user.uuid,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt.toISOString(),
      }),
      (error) => {
        throw mapDomainErrorToHttp(error);
      },
    );
  }
}
