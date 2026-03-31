import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MemberRoleEnum } from '@authorization/domain/enums/member-role.enum';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import { TierEnum } from '@authorization/domain/enums/tier.enum';

@Injectable()
export class RbacBootValidator implements OnModuleInit {
  private readonly logger = new Logger(RbacBootValidator.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.validateRoles();
    await this.validateActions();
    await this.validateTiers();
    this.logger.log('RBAC boot validation passed — enums are in sync with DB');
  }

  private async validateRoles(): Promise<void> {
    const rows: Array<{ key: string }> = await this.dataSource.query(
      `SELECT key FROM authz.roles WHERE is_active = true`,
    );
    const dbRoles = new Set(rows.map((r) => r.key));
    const enumRoles = new Set(Object.values(MemberRoleEnum));

    const missingInDb = [...enumRoles].filter((r) => !dbRoles.has(r));
    if (missingInDb.length > 0) {
      throw new Error(
        `RBAC boot validation failed: MemberRoleEnum values missing in authz.roles: ${missingInDb.join(', ')}`,
      );
    }
  }

  private async validateActions(): Promise<void> {
    const rows: Array<{ key: string }> = await this.dataSource.query(
      `SELECT key FROM capabilities.catalog_actions WHERE is_active = true`,
    );
    const dbActions = new Set(rows.map((r) => r.key));
    const enumActions = new Set(Object.values(SystemAction));

    const missingInDb = [...enumActions].filter((a) => !dbActions.has(a));
    if (missingInDb.length > 0) {
      throw new Error(
        `RBAC boot validation failed: SystemAction values missing in catalog_actions: ${missingInDb.join(', ')}`,
      );
    }
  }

  private async validateTiers(): Promise<void> {
    const rows: Array<{ tier: string }> = await this.dataSource.query(
      `SELECT tier FROM tiers.tier_plans`,
    );
    const dbTiers = new Set(rows.map((r) => r.tier));
    const enumTiers = new Set(Object.values(TierEnum));

    const missingInDb = [...enumTiers].filter((t) => !dbTiers.has(t));
    if (missingInDb.length > 0) {
      throw new Error(
        `RBAC boot validation failed: TierEnum values missing in tier_plans: ${missingInDb.join(', ')}`,
      );
    }
  }
}
