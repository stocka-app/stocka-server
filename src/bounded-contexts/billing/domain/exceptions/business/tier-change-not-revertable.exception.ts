import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class TierChangeNotRevertableException extends BusinessLogicException {
  constructor(tierChangeUUID: string, currentState: string) {
    super(
      `TierChange ${tierChangeUUID} is not revertable (current state: ${currentState})`,
      'TIER_CHANGE_NOT_REVERTABLE',
      [
        {
          field: 'state',
          message: `Revert is only valid in COLD_DOWN/EFFECTIVE/GRACE/ARCHIVED states, found ${currentState}`,
        },
      ],
    );
  }
}
