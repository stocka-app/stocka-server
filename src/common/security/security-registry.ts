import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import { SecurityMeta } from '@common/security/security.types';

/**
 * Centralized route → security policy mapping.
 *
 * Every controller endpoint must appear here. Routes NOT in the registry
 * default to JWT-only (authenticated but no tenant/RBAC checks).
 *
 * Route keys follow the pattern: `METHOD /controllerPath/handlerPath`
 * with the `/api` global prefix stripped (NestJS metadata does not include it).
 */
export const SecurityRegistry: Record<string, SecurityMeta> = {
  // ── Public ──────────────────────────────────────────────────────
  'GET /': { public: true },
  'GET /health': { public: true },
  'POST /authentication/sign-up': { public: true },
  'POST /authentication/sign-in': { public: true },
  'POST /authentication/sign-out': { public: true },
  'POST /authentication/refresh-session': { public: true },
  'POST /authentication/verify-email': { public: true },
  'POST /authentication/resend-verification-code': { public: true },
  'POST /authentication/forgot-password': { public: true },
  'POST /authentication/reset-password': { public: true },
  'GET /authentication/providers': { public: true },
  'GET /authentication/google': { public: true },
  'GET /authentication/google/callback': { public: true },
  'GET /authentication/facebook': { public: true },
  'GET /authentication/facebook/callback': { public: true },
  'GET /authentication/microsoft': { public: true },
  'GET /authentication/microsoft/callback': { public: true },
  'GET /authentication/apple': { public: true },
  'POST /authentication/apple/callback': { public: true },
  'GET /tenant/invitations/:token': { public: true },

  // ─��� JWT only ────────────────────────────────────────────────────
  'GET /users/me': {},
  'GET /users/me/consents': {},
  'POST /users/me/consents': {},
  'POST /onboarding/start': {},
  'POST /onboarding/complete': {},
  'GET /onboarding/status': {},
  'PATCH /onboarding/progress': {},
  'POST /tenant/invitations/:token/accept': {},

  // ── JWT only (tenant not yet created or optional at guard level) ──
  'POST /tenant/onboarding/complete': {},

  // ── JWT + Tenant active ────────────────────────────────────────
  'GET /tenant/me': { requireTenant: true },
  'GET /tenants/me/capabilities': { requireTenant: true },
  'GET /rbac/my-permissions': { requireTenant: true },
  'GET /rbac/assignable-roles': { requireTenant: true },
  'GET /rbac/roles': { requireTenant: true },

  // ── JWT + Tenant + RBAC ─────────────────────────────────────────
  'GET /tenant/me/invitations': { action: SystemAction.MEMBER_INVITE },
  'POST /tenant/me/invitations': { action: SystemAction.MEMBER_INVITE },
  'DELETE /tenant/me/invitations/:id': { action: SystemAction.MEMBER_INVITE },
  'POST /storages/warehouses': { action: SystemAction.STORAGE_CREATE },
  'POST /storages/custom-rooms': { action: SystemAction.STORAGE_CREATE },
  'POST /storages/store-rooms': { action: SystemAction.STORAGE_CREATE },
  'GET /storages': { action: SystemAction.STORAGE_READ },
  'GET /storages/:uuid': { action: SystemAction.STORAGE_READ },
  'PATCH /storages/warehouses/:uuid': { action: SystemAction.STORAGE_UPDATE },
  'PATCH /storages/custom-rooms/:uuid': { action: SystemAction.STORAGE_UPDATE },
  'PATCH /storages/store-rooms/:uuid': { action: SystemAction.STORAGE_UPDATE },
  // Change-storage-type per-transition (H-07 refactor — DT-H07-2 fix)
  'PATCH /storages/warehouses/:uuid/convert-to-store-room': { action: SystemAction.STORAGE_UPDATE },
  'PATCH /storages/warehouses/:uuid/convert-to-custom-room': {
    action: SystemAction.STORAGE_UPDATE,
  },
  'PATCH /storages/store-rooms/:uuid/convert-to-warehouse': { action: SystemAction.STORAGE_UPDATE },
  'PATCH /storages/store-rooms/:uuid/convert-to-custom-room': {
    action: SystemAction.STORAGE_UPDATE,
  },
  'PATCH /storages/custom-rooms/:uuid/convert-to-warehouse': {
    action: SystemAction.STORAGE_UPDATE,
  },
  'PATCH /storages/custom-rooms/:uuid/convert-to-store-room': {
    action: SystemAction.STORAGE_UPDATE,
  },
  // Archive (heredado de H-05) — endpoint a refactorizar a per-type en Paso 3
  'DELETE /storages/:uuid': { action: SystemAction.STORAGE_DELETE },
  // Restore (H-07)
  'POST /storages/warehouses/:uuid/restore': { action: SystemAction.STORAGE_RESTORE },
  'POST /storages/store-rooms/:uuid/restore': { action: SystemAction.STORAGE_RESTORE },
  'POST /storages/custom-rooms/:uuid/restore': { action: SystemAction.STORAGE_RESTORE },
  // Permanent delete (H-07 entry point — stub 501; flujo completo en historia separada)
  'DELETE /storages/:uuid/permanent': { action: SystemAction.STORAGE_DELETE },
};
