export enum SystemAction {
  // ── Storage module ─────────────────────────────────────────────────────────
  STORAGE_CREATE = 'STORAGE_CREATE',
  STORAGE_READ = 'STORAGE_READ',
  STORAGE_UPDATE = 'STORAGE_UPDATE',
  STORAGE_DELETE = 'STORAGE_DELETE',
  STORAGE_FREEZE = 'STORAGE_FREEZE',
  STORAGE_UNFREEZE = 'STORAGE_UNFREEZE',
  STORAGE_ARCHIVE = 'STORAGE_ARCHIVE',
  STORAGE_RESTORE = 'STORAGE_RESTORE',

  // ── Member management ──────────────────────────────────────────────────────
  MEMBER_INVITE = 'MEMBER_INVITE',
  MEMBER_READ = 'MEMBER_READ',
  MEMBER_UPDATE_ROLE = 'MEMBER_UPDATE_ROLE',
  MEMBER_REMOVE = 'MEMBER_REMOVE',

  // ── Product / Inventory ────────────────────────────────────────────────────
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_READ = 'PRODUCT_READ',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',

  // ── Reports ────────────────────────────────────────────────────────────────
  REPORT_READ = 'REPORT_READ',
  REPORT_ADVANCED = 'REPORT_ADVANCED',

  // ── Export ─────────────────────────────────────────────────────────────────
  INVENTORY_EXPORT = 'INVENTORY_EXPORT',

  // ── Tenant settings ────────────────────────────────────────────────────────
  TENANT_SETTINGS_READ = 'TENANT_SETTINGS_READ',
  TENANT_SETTINGS_UPDATE = 'TENANT_SETTINGS_UPDATE',
}
