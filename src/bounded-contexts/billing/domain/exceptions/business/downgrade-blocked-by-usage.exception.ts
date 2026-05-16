import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export interface DowngradeBlocker {
  module: string;
  current: number;
  max: number;
  excess: number;
}

export class DowngradeBlockedByUsageException extends BusinessLogicException {
  readonly blockers: DowngradeBlocker[];

  constructor(blockers: DowngradeBlocker[]) {
    const summary = blockers
      .map((b) => `${b.module}: ${b.current}/${b.max} (excess: ${b.excess})`)
      .join('; ');
    super(
      `Downgrade blocked by current usage exceeding target tier limits: ${summary}`,
      'DOWNGRADE_BLOCKED_BY_USAGE',
      blockers.map((b) => ({
        field: b.module,
        message: `${b.current} in use, max allowed at target tier is ${b.max} (excess: ${b.excess})`,
      })),
      { blockers },
    );
    this.blockers = blockers;
  }
}
