import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GoogleAuthenticationGuard } from '@authentication/infrastructure/guards/google-authentication.guard';
import { Secure } from '@common/decorators/secure.decorator';

@ApiTags('Authentication')
@Controller('authentication')
export class GoogleAuthenticationController {
  @Get('google')
  @Secure()
  @UseGuards(GoogleAuthenticationGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google for authentication',
  })
  handle(): void {
    // Guard automatically redirects to Google
  }
}
