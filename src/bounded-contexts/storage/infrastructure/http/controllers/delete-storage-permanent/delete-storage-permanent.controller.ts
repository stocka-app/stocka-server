import { Controller, Delete, HttpException, HttpStatus, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Secure } from '@common/decorators/secure.decorator';

/**
 * H-07 — Permanent delete entry point (stub).
 *
 * This endpoint is reserved for the permanent deletion flow whose full
 * implementation lives in a separate historia (out of H-07 scope).
 *
 * Returns 501 Not Implemented intentionally so the FE can wire the dialog
 * UX (FASE 5.3 of the Pencil plan) and surface a "feature in development"
 * toast to the user. The route is registered with STORAGE_DELETE in the
 * SecurityRegistry so the permission gate is in place from day one.
 */
@ApiTags('Storage')
@Controller('storages')
@ApiBearerAuth('JWT-authentication')
export class DeleteStoragePermanentController {
  @Delete(':uuid/permanent')
  @Secure()
  @ApiOperation({
    summary: 'Permanently delete a storage',
  })
  @ApiParam({ name: 'uuid', description: 'Storage UUID' })
  @ApiResponse({ status: 501, description: 'Permanent delete not implemented in Sprint 2' })
  handle(@Param('uuid') _uuid: string): never {
    throw new HttpException(
      {
        error: 'NOT_IMPLEMENTED',
        message: 'Permanent storage deletion is not implemented in Sprint 2',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
