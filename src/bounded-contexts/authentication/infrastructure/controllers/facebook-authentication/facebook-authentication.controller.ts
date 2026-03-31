import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FacebookAuthenticationGuard } from '@authentication/infrastructure/guards/facebook-authentication.guard';
import { Secure } from '@common/decorators/secure.decorator';

@ApiTags('Authentication')
@Controller('authentication')
export class FacebookAuthenticationController {
  @Get('facebook')
  @Secure()
  @UseGuards(FacebookAuthenticationGuard)
  @ApiOperation({ summary: 'Initiate Facebook OAuth flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Facebook for authentication',
  })
  handle(): void {
    // Guard automatically redirects to Facebook
  }
}
