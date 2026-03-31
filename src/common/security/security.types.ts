import { SystemAction } from '@shared/domain/policy/actions-catalog';

export const SECURE_KEY = 'isSecured';

export interface SecurityMeta {
  public?: true;
  requireTenant?: true;
  action?: SystemAction;
}
