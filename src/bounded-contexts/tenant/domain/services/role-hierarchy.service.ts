/**
 * Role hierarchy rules for invitation assignment (from A-07 Confluence doc):
 *
 * OWNER   → can assign PARTNER, MANAGER, BUYER, WAREHOUSE_KEEPER, SALES_REP, VIEWER
 * PARTNER → can assign MANAGER, BUYER, WAREHOUSE_KEEPER, SALES_REP, VIEWER
 * MANAGER → can assign BUYER, WAREHOUSE_KEEPER, SALES_REP, VIEWER
 * Others  → cannot assign anyone
 */
const ASSIGNABLE_ROLES: Record<string, string[]> = {
  OWNER: ['PARTNER', 'MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'],
  PARTNER: ['MANAGER', 'BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'],
  MANAGER: ['BUYER', 'WAREHOUSE_KEEPER', 'SALES_REP', 'VIEWER'],
};

export function canAssignRole(inviterRole: string, targetRole: string): boolean {
  return ASSIGNABLE_ROLES[inviterRole]?.includes(targetRole) ?? false;
}
