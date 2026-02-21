import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class SocialAccountRequiredException extends BusinessLogicException {
  constructor() {
    super(
      'This account was linked to a social provider. Please sign in using your connected OAuth account instead.',
      'SOCIAL_ACCOUNT_REQUIRED',
    );
  }
}
