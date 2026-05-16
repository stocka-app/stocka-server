import { Logger } from '@nestjs/common';

export interface ScheduledTaskError {
  itemId: string;
  error: string;
}

export interface ScheduledTaskReport {
  taskName: string;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  itemsFound: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errors: ScheduledTaskError[];
}

/**
 * Template-method skeleton for cron-driven scheduled tasks that:
 *   1. Query a repository for items "ready" at a given moment.
 *   2. Process each item idempotently.
 *   3. Report structured metrics for observability.
 *
 * Subclasses implement only the three hooks (`findReady`, `processOne`,
 * `identify`) and declare the cron expression via `@Cron(...)` on a thin
 * `run()` method that delegates to `this.execute()`. The base handles:
 *   - Per-item try/catch so one failure doesn't abort the batch
 *   - Logging of start, end, duration, and aggregate counts
 *   - A JSON-serializable `ScheduledTaskReport` for dashboards/alerts
 *
 * Idempotency is the subclass' responsibility: `processOne` must be safe
 * to call on already-processed items (handlers typically check state and
 * return early). The base provides no retry or dedup logic — the cron
 * tick interval is the natural retry window.
 *
 * Example consumer (plan 09 / Fase 8):
 *
 * ```ts
 * @Injectable()
 * export class AutoArchiveCron extends BaseScheduledTask<TierChangeAggregate> {
 *   readonly taskName = 'auto-archive';
 *   readonly maxBatchSize = 100;
 *
 *   constructor(
 *     @Inject(INJECTION_TOKENS.TIER_CHANGE_REPOSITORY)
 *     private readonly tierChangeRepo: ITierChangeRepository,
 *     private readonly commandBus: CommandBus,
 *   ) { super(); }
 *
 *   @Cron('0 3 * * *')
 *   async run(): Promise<void> { await this.execute(); }
 *
 *   async findReady(now: Date, batchSize: number) {
 *     return this.tierChangeRepo.findReadyToArchive(now, batchSize);
 *   }
 *
 *   async processOne(item: TierChangeAggregate): Promise<void> {
 *     await this.commandBus.execute(new ExecuteAutoArchiveCommand(item.uuid));
 *   }
 *
 *   identify(item: TierChangeAggregate): string { return item.uuid; }
 * }
 * ```
 */
export abstract class BaseScheduledTask<TItem> {
  protected readonly logger: Logger;
  abstract readonly taskName: string;
  abstract readonly maxBatchSize: number;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  abstract findReady(now: Date, batchSize: number): Promise<TItem[]>;
  abstract processOne(item: TItem): Promise<void>;
  abstract identify(item: TItem): string;

  async execute(): Promise<ScheduledTaskReport> {
    const startedAt = new Date();
    this.logger.log(`${this.taskName} started`);

    const items = await this.findReady(startedAt, this.maxBatchSize);
    const errors: ScheduledTaskError[] = [];
    let succeeded = 0;

    for (const item of items) {
      try {
        await this.processOne(item);
        succeeded++;
      } catch (caught) {
        const itemId = this.identify(item);
        const message = caught instanceof Error ? caught.message : String(caught);
        errors.push({ itemId, error: message });
        this.logger.error(
          `${this.taskName} failed for ${itemId}: ${message}`,
          caught instanceof Error ? caught.stack : undefined,
        );
      }
    }

    const finishedAt = new Date();
    const report: ScheduledTaskReport = {
      taskName: this.taskName,
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      itemsFound: items.length,
      itemsSucceeded: succeeded,
      itemsFailed: errors.length,
      errors,
    };

    this.logger.log(
      `${this.taskName} finished: ${JSON.stringify({
        found: report.itemsFound,
        succeeded: report.itemsSucceeded,
        failed: report.itemsFailed,
        durationMs: report.durationMs,
      })}`,
    );
    return report;
  }
}
