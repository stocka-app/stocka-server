import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Secure } from '@common/decorators/secure.decorator';
import { RbacRoleOutDto } from '@authorization/infrastructure/http/controllers/rbac/rbac-permissions-out.dto';

@ApiTags('RBAC')
@Controller('rbac')
@ApiBearerAuth('JWT-authentication')
export class GetRolesController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('roles')
  @Secure()
  @ApiOperation({ summary: 'Get active role catalog' })
  @ApiResponse({ status: 200, type: [RbacRoleOutDto] })
  async getRoles(): Promise<RbacRoleOutDto[]> {
    const rows: Array<{
      key: string;
      name_en: string;
      name_es: string;
      hierarchy_level: number;
    }> = await this.dataSource.query(
      `SELECT key, name_en, name_es, hierarchy_level
       FROM authz.roles WHERE is_active = true ORDER BY hierarchy_level`,
    );

    return rows.map((r) => ({
      key: r.key,
      nameEn: r.name_en,
      nameEs: r.name_es,
      hierarchyLevel: r.hierarchy_level,
    }));
  }
}
