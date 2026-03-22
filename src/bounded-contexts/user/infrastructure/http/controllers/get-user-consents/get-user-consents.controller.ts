import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import {
  GetUserConsentsQuery,
  GetUserConsentsQueryResult,
} from '@user/application/queries/get-user-consents/get-user-consents.query';
import { GetUserConsentsOutDto } from '@user/infrastructure/http/controllers/get-user-consents/get-user-consents-out.dto';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class GetUserConsentsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me/consents')
  @ApiOperation({ summary: 'Get current consent status for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Returns the latest consent status for each consent type',
    type: GetUserConsentsOutDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handle(@CurrentUser('uuid') uuid: string): Promise<GetUserConsentsOutDto> {
    const consents = await this.queryBus.execute<
      GetUserConsentsQuery,
      GetUserConsentsQueryResult
    >(new GetUserConsentsQuery(uuid));

    return { consents };
  }
}
