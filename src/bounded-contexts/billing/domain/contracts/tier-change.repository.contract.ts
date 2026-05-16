import { TierChangeAggregate } from '@billing/domain/aggregates/tier-change.aggregate';

/**
 * Repository contract for `TierChangeAggregate`. Long-lived tracking
 * records for subscription downgrades; queryable by primary key, by
 * pending state for a subscription, and by lifecycle position for the
 * archive/delete crons.
 */
export interface ITierChangeRepository {
  save(aggregate: TierChangeAggregate): Promise<TierChangeAggregate>;

  findByUUID(uuid: string): Promise<TierChangeAggregate | null>;

  /**
   * Returns the single pending (state = COLD_DOWN) tier change for a sub,
   * or null. Used by the handler to enforce "one pending at a time"
   * before invoking `subscription.downgrade()`.
   */
  findPendingBySubscription(subscriptionId: number): Promise<TierChangeAggregate | null>;

  /**
   * Tier changes stuck in COLD_DOWN whose `effectiveAt` passed more than
   * `threshold` time ago — for the cold-down safety-net cron to rescue
   * webhooks that never arrived (Stripe was supposed to notify us of the
   * period rollover but we missed the event).
   */
  findStuckInColdDown(threshold: Date, limit: number): Promise<TierChangeAggregate[]>;

  /**
   * Tier changes in GRACE whose `gracePeriodEndsAt` falls within
   * `daysAhead` days of `now`. Used by the reminders cron to send "your
   * archive grace is ending" emails before the day-15 auto-archive.
   */
  findArchiveGraceExpiringSoon(
    now: Date,
    daysAhead: number,
    limit: number,
  ): Promise<TierChangeAggregate[]>;

  /**
   * Tier changes in GRACE whose `gracePeriodEndsAt` is in the past —
   * ready for the auto-archive cron (day-15 transition GRACE → ARCHIVED).
   */
  findReadyToArchive(now: Date, limit: number): Promise<TierChangeAggregate[]>;

  /**
   * Tier changes in ARCHIVED whose `archivedAt + 60d` has passed and
   * have not been notified yet — for the pre-deletion notice cron
   * (day-60 warning email).
   */
  findReadyForPreDeletionNotice(now: Date, limit: number): Promise<TierChangeAggregate[]>;

  /**
   * Tier changes in ARCHIVED whose `archivedAt + 90d` has passed —
   * ready for the deletion cron (day-90 hard-delete).
   */
  findReadyToDelete(now: Date, limit: number): Promise<TierChangeAggregate[]>;
}
