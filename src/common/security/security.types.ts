import { SystemAction } from '@authorization/domain/enums/actions-catalog';

export const SECURE_KEY = 'isSecured';

export interface SecurityMeta {
  public?: true;
  requireTenant?: true;
  action?: SystemAction;
}
