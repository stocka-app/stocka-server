import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppleAuthenticationGuard } from '@authentication/infrastructure/guards/apple-authentication.guard';
import { Secure } from '@common/decorators/secure.decorator';

@ApiTags('Authentication')
@Controller('authentication')
export class AppleAuthenticationController {
  @Get('apple')
  @Secure()
  @UseGuards(AppleAuthenticationGuard)
  @ApiOperation({ summary: 'Initiate Apple OAuth flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Apple for authentication',
  })
  handle(): void {
    // Guard automatically redirects to Apple
  }
}
