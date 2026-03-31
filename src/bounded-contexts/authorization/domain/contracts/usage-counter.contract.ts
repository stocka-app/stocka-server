import { UsageCounts } from '@authorization/domain/models/policy-context';

export interface IUsageCounterContract {
  getUsageCounts(tenantId: string): Promise<UsageCounts>;
}
