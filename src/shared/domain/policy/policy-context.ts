import { TierEnum } from '@shared/domain/policy/tier.enum';
import { MemberRoleEnum } from '@shared/domain/policy/member-role.enum';
import { SystemAction } from '@shared/domain/policy/actions-catalog';

export interface UsageCounts {
  storageCount: number;
  memberCount: number;
  productCount: number;
}

export interface PolicyContext {
  tenantTier: TierEnum;
  userRole: MemberRoleEnum;
  action: SystemAction;
  usageCounts?: Partial<UsageCounts>;
}
