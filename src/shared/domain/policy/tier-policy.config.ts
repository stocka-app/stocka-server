import { TierEnum } from '@shared/domain/policy/tier.enum';
import { MemberRoleEnum } from '@shared/domain/policy/member-role.enum';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { UsageCounts } from '@shared/domain/policy/policy-context';

// ── Tier order (used for "at least" comparisons) ───────────────────────────

export const TIER_ORDER: Readonly<Record<TierEnum, number>> = {
  [TierEnum.FREE]: 0,
  [TierEnum.STARTER]: 1,
  [TierEnum.GROWTH]: 2,
  [TierEnum.ENTERPRISE]: 3,
};

// ── Minimum tier required to access each action ────────────────────────────

export const ACTION_TIER_REQUIREMENTS: Readonly<Record<SystemAction, TierEnum>> = {
  // Storage — FREE has 0 warehouses, so CREATE/UPDATE/DELETE require STARTER+
  [SystemAction.STORAGE_CREATE]: TierEnum.STARTER,
  [SystemAction.STORAGE_READ]: TierEnum.FREE,
  [SystemAction.STORAGE_UPDATE]: TierEnum.STARTER,
  [SystemAction.STORAGE_DELETE]: TierEnum.STARTER,

  // Members — invitations require STARTER+
  [SystemAction.MEMBER_INVITE]: TierEnum.STARTER,
  [SystemAction.MEMBER_READ]: TierEnum.FREE,
  [SystemAction.MEMBER_UPDATE_ROLE]: TierEnum.STARTER,
  [SystemAction.MEMBER_REMOVE]: TierEnum.STARTER,

  // Products — all tiers can manage products
  [SystemAction.PRODUCT_CREATE]: TierEnum.FREE,
  [SystemAction.PRODUCT_READ]: TierEnum.FREE,
  [SystemAction.PRODUCT_UPDATE]: TierEnum.FREE,
  [SystemAction.PRODUCT_DELETE]: TierEnum.FREE,

  // Reports
  [SystemAction.REPORT_READ]: TierEnum.FREE,
  [SystemAction.REPORT_ADVANCED]: TierEnum.GROWTH,

  // Export — requires at least STARTER
  [SystemAction.INVENTORY_EXPORT]: TierEnum.STARTER,

  // Tenant settings
  [SystemAction.TENANT_SETTINGS_READ]: TierEnum.FREE,
  [SystemAction.TENANT_SETTINGS_UPDATE]: TierEnum.FREE,
};

// ── Actions allowed per role ───────────────────────────────────────────────

const ALL_ACTIONS = new Set(Object.values(SystemAction));

export const ROLE_ALLOWED_ACTIONS: Readonly<Record<MemberRoleEnum, ReadonlySet<SystemAction>>> = {
  // OWNER: unrestricted access to everything
  [MemberRoleEnum.OWNER]: ALL_ACTIONS,

  // PARTNER: all actions except changing core tenant settings
  [MemberRoleEnum.PARTNER]: new Set([
    SystemAction.STORAGE_CREATE,
    SystemAction.STORAGE_READ,
    SystemAction.STORAGE_UPDATE,
    SystemAction.STORAGE_DELETE,
    SystemAction.MEMBER_INVITE,
    SystemAction.MEMBER_READ,
    SystemAction.MEMBER_UPDATE_ROLE,
    SystemAction.MEMBER_REMOVE,
    SystemAction.PRODUCT_CREATE,
    SystemAction.PRODUCT_READ,
    SystemAction.PRODUCT_UPDATE,
    SystemAction.PRODUCT_DELETE,
    SystemAction.REPORT_READ,
    SystemAction.REPORT_ADVANCED,
    SystemAction.INVENTORY_EXPORT,
    SystemAction.TENANT_SETTINGS_READ,
  ]),

  // MANAGER: operational control — no member role changes or tenant settings
  [MemberRoleEnum.MANAGER]: new Set([
    SystemAction.STORAGE_CREATE,
    SystemAction.STORAGE_READ,
    SystemAction.STORAGE_UPDATE,
    SystemAction.STORAGE_DELETE,
    SystemAction.MEMBER_INVITE,
    SystemAction.MEMBER_READ,
    SystemAction.PRODUCT_CREATE,
    SystemAction.PRODUCT_READ,
    SystemAction.PRODUCT_UPDATE,
    SystemAction.PRODUCT_DELETE,
    SystemAction.REPORT_READ,
    SystemAction.REPORT_ADVANCED,
    SystemAction.INVENTORY_EXPORT,
    SystemAction.TENANT_SETTINGS_READ,
  ]),

  // BUYER: procurement focused — products and basic reports
  [MemberRoleEnum.BUYER]: new Set([
    SystemAction.PRODUCT_CREATE,
    SystemAction.PRODUCT_READ,
    SystemAction.PRODUCT_UPDATE,
    SystemAction.REPORT_READ,
    SystemAction.TENANT_SETTINGS_READ,
  ]),

  // WAREHOUSE_KEEPER: storage and product operations, export
  [MemberRoleEnum.WAREHOUSE_KEEPER]: new Set([
    SystemAction.STORAGE_READ,
    SystemAction.STORAGE_UPDATE,
    SystemAction.PRODUCT_READ,
    SystemAction.PRODUCT_UPDATE,
    SystemAction.INVENTORY_EXPORT,
    SystemAction.REPORT_READ,
    SystemAction.TENANT_SETTINGS_READ,
  ]),

  // SALES_REP: read-only products and basic reports
  [MemberRoleEnum.SALES_REP]: new Set([
    SystemAction.PRODUCT_READ,
    SystemAction.REPORT_READ,
    SystemAction.TENANT_SETTINGS_READ,
  ]),

  // VIEWER: read-only across all modules
  [MemberRoleEnum.VIEWER]: new Set([
    SystemAction.STORAGE_READ,
    SystemAction.MEMBER_READ,
    SystemAction.PRODUCT_READ,
    SystemAction.REPORT_READ,
    SystemAction.TENANT_SETTINGS_READ,
  ]),
};

// ── Numeric limits per tier ────────────────────────────────────────────────
// -1 = unlimited (ENTERPRISE)

export type LimitKey = keyof UsageCounts;

export const TIER_NUMERIC_LIMITS: Readonly<Record<TierEnum, Readonly<Record<LimitKey, number>>>> = {
  [TierEnum.FREE]: { storageCount: 0, memberCount: 1, productCount: 100 },
  [TierEnum.STARTER]: { storageCount: 3, memberCount: 5, productCount: 1000 },
  [TierEnum.GROWTH]: { storageCount: 10, memberCount: 25, productCount: 5000 },
  [TierEnum.ENTERPRISE]: { storageCount: -1, memberCount: -1, productCount: -1 },
};

// ── Which actions trigger a limit check and against which counter ──────────

export const ACTION_LIMIT_CHECKS: Readonly<Partial<Record<SystemAction, LimitKey>>> = {
  [SystemAction.STORAGE_CREATE]: 'storageCount',
  [SystemAction.MEMBER_INVITE]: 'memberCount',
  [SystemAction.PRODUCT_CREATE]: 'productCount',
};
