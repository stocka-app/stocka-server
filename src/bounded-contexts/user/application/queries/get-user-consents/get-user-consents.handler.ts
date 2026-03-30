import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserConsentEntity } from '@user/infrastructure/persistence/entities/user-consent.entity';
import {
  GetUserConsentsQuery,
  GetUserConsentsQueryResult,
  UserConsentStatusDto,
} from '@user/application/queries/get-user-consents/get-user-consents.query';

@QueryHandler(GetUserConsentsQuery)
export class GetUserConsentsHandler implements IQueryHandler<
  GetUserConsentsQuery,
  GetUserConsentsQueryResult
> {
  constructor(
    @InjectRepository(UserConsentEntity)
    private readonly consentRepository: Repository<UserConsentEntity>,
  ) {}

  async execute(query: GetUserConsentsQuery): Promise<GetUserConsentsQueryResult> {
    // DISTINCT ON is PostgreSQL-specific; TypeORM QueryBuilder does not support it,
    // so we use a raw query against the identity.user_consents table.
    const rows: Array<Record<string, unknown>> = await this.consentRepository.query(
      `SELECT DISTINCT ON (consent_type)
              consent_type   AS "consentType",
              granted,
              document_version AS "documentVersion",
              created_at     AS "grantedAt"
       FROM identity.user_consents
       WHERE user_uuid = $1
       ORDER BY consent_type, created_at DESC`,
      [query.userUUID],
    );

    return rows.map(
      (row): UserConsentStatusDto => ({
        consentType: row.consentType as string,
        granted: row.granted as boolean,
        documentVersion: row.documentVersion as string,
        grantedAt: (row.grantedAt as Date).toISOString(),
      }),
    );
  }
}
