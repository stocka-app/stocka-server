import { UsageCounts } from '@shared/domain/policy/policy-context';

export interface IUsageCounterContract {
  getUsageCounts(tenantId: string): Promise<UsageCounts>;
}
