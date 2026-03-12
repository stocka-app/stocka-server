import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MicrosoftAuthenticationGuard } from '@authentication/infrastructure/guards/microsoft-authentication.guard';

@ApiTags('Authentication')
@Controller('authentication')
export class MicrosoftAuthenticationController {
  @Get('microsoft')
  @UseGuards(MicrosoftAuthenticationGuard)
  @ApiOperation({
    summary: 'Initiate Microsoft OAuth flow',
    description:
      'Redirects to Microsoft for authentication. Supports personal and corporate accounts.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Microsoft for authentication',
  })
  @ApiResponse({
    status: 501,
    description: 'Microsoft Sign-In is not available (feature disabled)',
  })
  handle(): void {
    // Guard automatically redirects to Microsoft
  }
}
