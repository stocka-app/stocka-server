import { SystemAction } from '@shared/domain/policy/actions-catalog';

export interface ActionCapability {
  enabled: boolean;
  reason?: string;
}

export type CapabilitySnapshot = Record<SystemAction, ActionCapability>;

export function createEmptySnapshot(): CapabilitySnapshot {
  const snapshot = {} as CapabilitySnapshot;
  for (const action of Object.values(SystemAction)) {
    snapshot[action] = { enabled: false, reason: 'Not evaluated' };
  }
  return snapshot;
}

export function isValidSnapshot(value: unknown): value is CapabilitySnapshot {
  if (typeof value !== 'object' || value === null) return false;

  const record = value as Record<string, unknown>;
  const allActions = Object.values(SystemAction);

  for (const action of allActions) {
    const entry = record[action];
    if (typeof entry !== 'object' || entry === null) return false;

    const capability = entry as Record<string, unknown>;
    if (typeof capability['enabled'] !== 'boolean') return false;

    if ('reason' in capability && typeof capability['reason'] !== 'string') return false;
  }

  return true;
}
