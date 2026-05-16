import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InvalidTierChangeTransitionException extends BusinessLogicException {
  constructor(tierChangeUUID: string, currentState: string, requestedState: string) {
    super(
      `TierChange ${tierChangeUUID} cannot transition from ${currentState} to ${requestedState}`,
      'INVALID_TIER_CHANGE_TRANSITION',
      [
        {
          field: 'state',
          message: `Transition ${currentState} → ${requestedState} is not allowed by the state machine`,
        },
      ],
    );
  }
}
