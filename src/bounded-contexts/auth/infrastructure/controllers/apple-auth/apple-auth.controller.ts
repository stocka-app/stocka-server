import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppleAuthGuard } from '@/auth/infrastructure/guards/apple-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AppleAuthController {
  @Get('apple')
  @UseGuards(AppleAuthGuard)
  @ApiOperation({ summary: 'Initiate Apple OAuth flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Apple for authentication',
  })
  handle(): void {
    // Guard automatically redirects to Apple
  }
}
