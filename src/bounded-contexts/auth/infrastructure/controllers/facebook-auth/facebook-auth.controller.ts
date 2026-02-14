import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FacebookAuthGuard } from '@auth/infrastructure/guards/facebook-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class FacebookAuthController {
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  @ApiOperation({ summary: 'Initiate Facebook OAuth flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Facebook for authentication',
  })
  handle(): void {
    // Guard automatically redirects to Facebook
  }
}
