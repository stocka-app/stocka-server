/**
 * Social authentication providers supported by Stocka.
 *
 * See ADR-001 for provider selection rationale.
 */
export enum SocialProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  MICROSOFT = 'microsoft',
  APPLE = 'apple', // Disabled - kept for data compatibility
}

/**
 * Providers currently active and available for authentication.
 * Use this for validation and UI rendering.
 */
export const ACTIVE_SOCIAL_PROVIDERS = [
  SocialProvider.GOOGLE,
  SocialProvider.FACEBOOK,
  SocialProvider.MICROSOFT,
] as const;

/**
 * Providers that are implemented but temporarily disabled.
 * Code exists but is controlled by feature flags.
 */
export const DISABLED_SOCIAL_PROVIDERS = [SocialProvider.APPLE] as const;

/**
 * Type for active providers only.
 * Use when you need to restrict to currently available options.
 */
export type ActiveSocialProvider = (typeof ACTIVE_SOCIAL_PROVIDERS)[number];

/**
 * Check if a provider is currently active.
 */
export function isActiveProvider(provider: string): provider is ActiveSocialProvider {
  return ACTIVE_SOCIAL_PROVIDERS.includes(provider as ActiveSocialProvider);
}
