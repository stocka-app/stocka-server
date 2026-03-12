import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

interface ProviderInfo {
  id: string;
  name: string;
  enabled: boolean;
  authUrl: string;
}

interface AuthenticationProvidersResponse {
  providers: ProviderInfo[];
  emailPasswordEnabled: boolean;
}

@ApiTags('Authentication')
@Controller('authentication')
export class AuthenticationProvidersController {
  constructor(private readonly configService: ConfigService) {}

  @Get('providers')
  @ApiOperation({
    summary: 'List available authentication providers',
    description:
      'Returns the list of enabled social authentication providers. Use this to dynamically render login buttons.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of authentication providers',
  })
  getProviders(): AuthenticationProvidersResponse {
    const apiPrefix = this.configService.get<string>('API_PREFIX', 'api');
    const port = this.configService.get<number>('PORT', 3001);
    const baseUrl = `http://localhost:${port}/${apiPrefix}`;

    const allProviders: ProviderInfo[] = [
      {
        id: 'google',
        name: 'Google',
        enabled: this.configService.get<string>('GOOGLE_AUTHENTICATION_ENABLED', 'true') === 'true',
        authUrl: `${baseUrl}/authentication/google`,
      },
      {
        id: 'facebook',
        name: 'Facebook',
        enabled: this.configService.get<string>('FACEBOOK_AUTHENTICATION_ENABLED', 'true') === 'true',
        authUrl: `${baseUrl}/authentication/facebook`,
      },
      {
        id: 'microsoft',
        name: 'Microsoft',
        enabled: this.configService.get<string>('MICROSOFT_AUTHENTICATION_ENABLED', 'true') === 'true',
        authUrl: `${baseUrl}/authentication/microsoft`,
      },
      {
        id: 'apple',
        name: 'Apple',
        enabled: this.configService.get<string>('APPLE_AUTHENTICATION_ENABLED', 'false') === 'true',
        authUrl: `${baseUrl}/authentication/apple`,
      },
    ];

    // Only return enabled providers
    const enabledProviders = allProviders.filter((provider) => provider.enabled);

    return {
      providers: enabledProviders,
      emailPasswordEnabled: true,
    };
  }
}
