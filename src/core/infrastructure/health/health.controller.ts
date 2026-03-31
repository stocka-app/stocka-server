import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DataSource } from 'typeorm';
import { Secure } from '@common/decorators/secure.decorator';

interface HealthResponse {
  status: 'ok' | 'error';
  db: 'connected' | 'disconnected';
}

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @Secure()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check — server and database status' })
  @ApiResponse({ status: 200, description: 'Server and DB are healthy' })
  @ApiResponse({ status: 503, description: 'Database is unreachable' })
  async check(@Res() res: Response): Promise<void> {
    const health = await this.getHealthStatus();

    const statusCode = health.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    res.status(statusCode).json(health);
  }

  private async getHealthStatus(): Promise<HealthResponse> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch {
      return { status: 'error', db: 'disconnected' };
    }
  }
}
