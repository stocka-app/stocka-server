import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class PurgeUnverifiedUsersService {
  private readonly logger = new Logger(PurgeUnverifiedUsersService.name);

  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeStaleUnverifiedUsers(): Promise<void> {
    const olderThanDays = this.configService.get<number>('UNVERIFIED_USER_PURGE_DAYS', 30);

    this.logger.log(
      `Running purge job: deleting unverified users inactive for more than ${olderThanDays} days`,
    );

    const deleted = await this.userContract.destroyStaleUnverifiedUsers(olderThanDays);

    this.logger.log(`Purge job complete: ${deleted} stale unverified user(s) removed`);
  }
}
