/**
 * Integration event: Auth BC → User BC.
 * Published by Auth BC after email verification is completed.
 * User BC reacts by marking the user's email as verified.
 *
 * NOTE: This is a re-export of the Auth BC event for clarity.
 * The actual event class is EmailVerificationCompletedEvent from Auth BC.
 * User BC imports it directly since domain events are the sanctioned
 * cross-BC communication mechanism in DDD.
 */
export { EmailVerificationCompletedEvent } from '@authentication/domain/events/email-verification-completed.event';
export { UserPasswordResetByAuthenticationEvent } from '@shared/domain/events/integration/user-password-reset-by-authentication.event';
export { UserVerificationBlockedByAuthenticationEvent } from '@shared/domain/events/integration/user-verification-blocked-by-authentication.event';
export { TenantTierChangedIntegrationEvent } from '@shared/domain/events/integration/tenant-tier-changed.integration-event';
export { TenantUsageMustBeArchivedIntegrationEvent } from '@shared/domain/events/integration/tenant-usage-must-be-archived.integration-event';
export { TenantUsageMustBePermanentlyDeletedIntegrationEvent } from '@shared/domain/events/integration/tenant-usage-must-be-permanently-deleted.integration-event';
