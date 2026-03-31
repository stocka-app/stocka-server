import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { MemberRoleEnum } from '@authorization/domain/enums/member-role.enum';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';

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
