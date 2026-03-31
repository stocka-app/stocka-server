import { Controller, Get, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Secure } from '@common/decorators/secure.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ITenantFacade } from '@tenant/domain/contracts/tenant-facade.contract';
import { IRbacPolicyPort } from '@authorization/domain/contracts/rbac-policy.port';
import { RbacAssignableRoleOutDto } from '@authorization/infrastructure/http/controllers/rbac/rbac-permissions-out.dto';

@ApiTags('RBAC')
@Controller('rbac')
@ApiBearerAuth('JWT-authentication')
export class GetAssignableRolesController {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_FACADE)
    private readonly tenantFacade: ITenantFacade,
    @Inject(INJECTION_TOKENS.RBAC_POLICY_PORT)
    private readonly rbacPort: IRbacPolicyPort,
    private readonly dataSource: DataSource,
  ) {}

  @Get('assignable-roles')
  @Secure()
  @ApiOperation({ summary: 'Get roles assignable by the current user' })
  @ApiResponse({ status: 200, type: [RbacAssignableRoleOutDto] })
  @ApiResponse({ status: 403, description: 'No active membership' })
  async getAssignableRoles(@CurrentUser() user: JwtPayload): Promise<RbacAssignableRoleOutDto[]> {
    const ctx = await this.tenantFacade.getMembershipContext(user.uuid);
    if (!ctx) {
      throw new HttpException({ error: 'MEMBERSHIP_REQUIRED' }, HttpStatus.FORBIDDEN);
    }

    const assignableKeys = await this.rbacPort.getAssignableRoles(ctx.role);

    if (assignableKeys.length === 0) return [];

    const rows: Array<{ key: string; name_en: string; name_es: string }> =
      await this.dataSource.query(
        `SELECT key, name_en, name_es FROM authz.roles
         WHERE key = ANY($1) AND is_active = true ORDER BY hierarchy_level`,
        [assignableKeys],
      );

    return rows.map((r) => ({
      key: r.key,
      nameEn: r.name_en,
      nameEs: r.name_es,
    }));
  }
}
