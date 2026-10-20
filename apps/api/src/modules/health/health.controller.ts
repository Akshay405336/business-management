import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReadinessService, type ReadinessReport } from './readiness.service.js';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(@Inject(ReadinessService) private readonly readiness: ReadinessService) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness: the process is running and serving requests' })
  @ApiOkResponse({ description: '{ "status": "ok" }' })
  health(): { status: 'ok'; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness: PostgreSQL and Redis are reachable' })
  @ApiOkResponse({ description: 'All dependencies are up' })
  @ApiServiceUnavailableResponse({ description: 'At least one dependency is down' })
  async ready(
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ status: 'ready' | 'not_ready'; checks: ReadinessReport['checks'] }> {
    const report = await this.readiness.check();
    if (!report.ready) response.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status: report.ready ? 'ready' : 'not_ready', checks: report.checks };
  }
}
