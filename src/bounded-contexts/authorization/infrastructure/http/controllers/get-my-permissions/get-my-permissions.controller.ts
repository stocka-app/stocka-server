import { Controller, Get, Inject, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ITenantFacade } from '@tenant/domain/contracts/tenant-facade.contract';
import { IRbacPolicyPort } from '@authorization/domain/contracts/rbac-policy.port';
import { RbacPermissionsOutDto } from '@authorization/infrastructure/http/controllers/rbac/rbac-permissions-out.dto';

@ApiTags('RBAC')
@Controller('rbac')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class GetMyPermissionsController {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_FACADE)
    private readonly tenantFacade: ITenantFacade,
    @Inject(INJECTION_TOKENS.RBAC_POLICY_PORT)
    private readonly rbacPort: IRbacPolicyPort,
    private readonly dataSource: DataSource,
  ) {}

  @Get('my-permissions')
  @ApiOperation({ summary: 'Get effective permissions for the current user' })
  @ApiResponse({ status: 200, type: RbacPermissionsOutDto })
  @ApiResponse({ status: 403, description: 'No active membership' })
  async getMyPermissions(@CurrentUser() user: JwtPayload): Promise<RbacPermissionsOutDto> {
    const ctx = await this.tenantFacade.getMembershipContext(user.uuid);
    if (!ctx) {
      throw new HttpException({ error: 'MEMBERSHIP_REQUIRED' }, HttpStatus.FORBIDDEN);
    }

    const [roleActions, userGrants] = await Promise.all([
      this.rbacPort.getRoleActions(ctx.role),
      this.getTenantAndUserIds(user.uuid, ctx.tenantUUID).then(({ tenantId, userId }) =>
        this.rbacPort.getUserGrants(tenantId, userId),
      ),
    ]);

    return {
      role: ctx.role,
      tier: ctx.tier,
      actions: [...roleActions],
      grants: [...userGrants],
    };
  }

  private async getTenantAndUserIds(
    userUUID: string,
    tenantUUID: string,
  ): Promise<{ tenantId: number; userId: number }> {
    const rows: Array<{ tenant_id: number; user_id: number }> = await this.dataSource.query(
      `SELECT tm.tenant_id, tm.user_id
       FROM tenants.tenant_members tm
       JOIN tenants.tenants t ON t.id = tm.tenant_id
       JOIN identity.users u ON u.id = tm.user_id
       WHERE u.uuid = $1 AND t.uuid = $2 AND tm.status = 'active'
       LIMIT 1`,
      [userUUID, tenantUUID],
    );

    /* istanbul ignore next -- defensive fallback: getMembershipContext should prevent this state */
    if (rows.length === 0) {
      return { tenantId: 0, userId: 0 };
    }

    return { tenantId: rows[0].tenant_id, userId: rows[0].user_id };
  }
}
