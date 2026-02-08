import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MicrosoftAuthGuard } from '@/auth/infrastructure/guards/microsoft-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class MicrosoftAuthController {
  @Get('microsoft')
  @UseGuards(MicrosoftAuthGuard)
  @ApiOperation({
    summary: 'Initiate Microsoft OAuth flow',
    description: 'Redirects to Microsoft for authentication. Supports personal and corporate accounts.',
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
