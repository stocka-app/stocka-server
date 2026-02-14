import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GoogleAuthGuard } from '@auth/infrastructure/guards/google-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class GoogleAuthController {
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google for authentication',
  })
  handle(): void {
    // Guard automatically redirects to Google
  }
}
