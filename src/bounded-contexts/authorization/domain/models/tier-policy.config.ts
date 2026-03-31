import { UsageCounts } from '@authorization/domain/models/policy-context';

// ── Types kept for compile-time safety ──────────────────────────────────────
// All policy data now lives in the authz schema (DB-driven via IRbacPolicyPort).
// These types are retained for backward compatibility in test helpers.

export type LimitKey = keyof UsageCounts;
