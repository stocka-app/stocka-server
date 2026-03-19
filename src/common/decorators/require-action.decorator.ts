import { SetMetadata } from '@nestjs/common';
import { SystemAction } from '@shared/domain/policy/actions-catalog';

export const REQUIRE_ACTION_KEY = 'require_action';

export const RequireAction = (action: SystemAction): MethodDecorator =>
  SetMetadata(REQUIRE_ACTION_KEY, action);
