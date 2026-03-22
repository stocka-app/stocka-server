import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import {
  RecordUserConsentsCommand,
  RecordUserConsentsResult,
} from '@user/application/commands/record-user-consents/record-user-consents.command';
import { RecordUserConsentsInDto } from '@user/infrastructure/http/controllers/record-user-consents/record-user-consents-in.dto';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class RecordUserConsentsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('me/consents')
  @HttpCode(201)
  @ApiOperation({ summary: 'Record user consent preferences (append-only audit trail)' })
  @ApiResponse({ status: 201, description: 'Consents recorded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Failed to persist consents' })
  async handle(
    @Body() dto: RecordUserConsentsInDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ): Promise<{ recorded: boolean }> {
    const ipAddress = request.ip ?? null;
    const userAgent = request.headers['user-agent'] ?? null;

    const result = await this.commandBus.execute<
      RecordUserConsentsCommand,
      RecordUserConsentsResult
    >(
      new RecordUserConsentsCommand(
        user.uuid,
        { terms: dto.terms, marketing: dto.marketing, analytics: dto.analytics },
        ipAddress,
        userAgent,
      ),
    );

    return result.match(
      () => ({ recorded: true }),
      (error) => {
        throw error;
      },
    );
  }
}
