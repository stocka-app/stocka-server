import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RecordUserConsentsCommand,
  RecordUserConsentsResult,
} from '@user/application/commands/record-user-consents/record-user-consents.command';
import { UserConsentEntity } from '@user/infrastructure/persistence/entities/user-consent.entity';
import { ConsentType } from '@user/domain/enums/consent-type.enum';
import { ConsentPersistenceException } from '@user/domain/exceptions/consent-persistence.exception';
import { ok, err } from '@shared/domain/result';

@CommandHandler(RecordUserConsentsCommand)
export class RecordUserConsentsHandler implements ICommandHandler<RecordUserConsentsCommand> {
  constructor(
    @InjectRepository(UserConsentEntity)
    private readonly consentRepository: Repository<UserConsentEntity>,
  ) {}

  async execute(command: RecordUserConsentsCommand): Promise<RecordUserConsentsResult> {
    const { userUUID, consents, ipAddress, userAgent } = command;

    const consentRows: UserConsentEntity[] = [
      this.buildRow(userUUID, ConsentType.TERMS_OF_SERVICE, consents.terms, ipAddress, userAgent),
      this.buildRow(userUUID, ConsentType.PRIVACY_POLICY, consents.terms, ipAddress, userAgent),
      this.buildRow(
        userUUID,
        ConsentType.MARKETING_COMMUNICATIONS,
        consents.marketing,
        ipAddress,
        userAgent,
      ),
      this.buildRow(
        userUUID,
        ConsentType.ANONYMOUS_ANALYTICS,
        consents.analytics,
        ipAddress,
        userAgent,
      ),
    ];

    try {
      await this.consentRepository.save(consentRows);
      return ok(undefined);
    /* istanbul ignore next */
    } catch (error) {
      /* istanbul ignore next */
      return err(
        new ConsentPersistenceException(
          error instanceof Error ? error.message : 'Failed to record user consents',
        ),
      );
    }
  }

  private buildRow(
    userUUID: string,
    consentType: ConsentType,
    granted: boolean,
    ipAddress: string | null,
    userAgent: string | null,
  ): UserConsentEntity {
    const entity = new UserConsentEntity();
    entity.userUUID = userUUID;
    entity.consentType = consentType;
    entity.granted = granted;
    entity.ipAddress = ipAddress;
    entity.userAgent = userAgent;
    return entity;
  }
}
