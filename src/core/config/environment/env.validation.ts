import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsNumber()
  PORT!: number;

  @IsString()
  API_PREFIX!: string;

  @IsString()
  FRONTEND_URL!: string;

  @IsNumber()
  REQUEST_TIMEOUT_MS!: number;

  // Database
  @IsString()
  DB_HOST!: string;

  @IsNumber()
  DB_PORT!: number;

  @IsString()
  DB_USERNAME!: string;

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  DB_DATABASE!: string;

  // JWT
  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRATION!: string;

  @IsString()
  JWT_REFRESH_EXPIRATION!: string;

  // OAuth
  @IsString()
  @MinLength(32, { message: 'OAUTH_STATE_SECRET must be at least 32 characters' })
  OAUTH_STATE_SECRET!: string;

  // CORS
  @IsString()
  CORS_ORIGIN!: string;

  // Feature Flags - Social Authentication Providers
  @IsString()
  @IsOptional()
  GOOGLE_AUTHENTICATION_ENABLED?: string;

  @IsString()
  @IsOptional()
  FACEBOOK_AUTHENTICATION_ENABLED?: string;

  @IsString()
  @IsOptional()
  MICROSOFT_AUTHENTICATION_ENABLED?: string;

  @IsString()
  @IsOptional()
  APPLE_AUTHENTICATION_ENABLED?: string;

  // Google OAuth (optional in dev)
  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL?: string;

  // Facebook OAuth (optional in dev)
  @IsString()
  @IsOptional()
  FACEBOOK_APP_ID?: string;

  @IsString()
  @IsOptional()
  FACEBOOK_APP_SECRET?: string;

  @IsString()
  @IsOptional()
  FACEBOOK_CALLBACK_URL?: string;

  // Microsoft OAuth (optional - enabled by default)
  @IsString()
  @IsOptional()
  MICROSOFT_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  MICROSOFT_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  MICROSOFT_TENANT_ID?: string;

  @IsString()
  @IsOptional()
  MICROSOFT_CALLBACK_URL?: string;

  // Apple OAuth (DISABLED - See ADR-001)
  @IsString()
  @IsOptional()
  APPLE_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  APPLE_TEAM_ID?: string;

  @IsString()
  @IsOptional()
  APPLE_KEY_ID?: string;

  @IsString()
  @IsOptional()
  APPLE_PRIVATE_KEY?: string;

  @IsString()
  @IsOptional()
  APPLE_CALLBACK_URL?: string;

  // Email (Resend)
  @IsString()
  RESEND_API_KEY!: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM?: string;

  @IsNumber()
  @IsOptional()
  VERIFICATION_CODE_EXPIRATION_MINUTES?: number;

  // E2E testing mode — disables rate limiting and progressive blocking
  @IsString()
  @IsOptional()
  E2E_MODE?: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
