import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

interface ProviderInfo {
  id: string;
  name: string;
  enabled: boolean;
  authUrl: string;
}

interface AuthProvidersResponse {
  providers: ProviderInfo[];
  emailPasswordEnabled: boolean;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthProvidersController {
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
  getProviders(): AuthProvidersResponse {
    const apiPrefix = this.configService.get<string>('API_PREFIX', 'api');
    const port = this.configService.get<number>('PORT', 3001);
    const baseUrl = `http://localhost:${port}/${apiPrefix}`;

    const allProviders: ProviderInfo[] = [
      {
        id: 'google',
        name: 'Google',
        enabled: this.configService.get<string>('GOOGLE_AUTH_ENABLED', 'true') === 'true',
        authUrl: `${baseUrl}/auth/google`,
      },
      {
        id: 'facebook',
        name: 'Facebook',
        enabled: this.configService.get<string>('FACEBOOK_AUTH_ENABLED', 'true') === 'true',
        authUrl: `${baseUrl}/auth/facebook`,
      },
      {
        id: 'microsoft',
        name: 'Microsoft',
        enabled: this.configService.get<string>('MICROSOFT_AUTH_ENABLED', 'true') === 'true',
        authUrl: `${baseUrl}/auth/microsoft`,
      },
      {
        id: 'apple',
        name: 'Apple',
        enabled: this.configService.get<string>('APPLE_AUTH_ENABLED', 'false') === 'true',
        authUrl: `${baseUrl}/auth/apple`,
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
