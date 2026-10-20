import { Inject, Injectable } from '@nestjs/common';
import {
  PLATFORM_AUTH_REPOSITORY,
  type PlatformAuthRepository,
} from '../../domain/repositories/platform-auth.repository.js';
import type { LogoutAllDevicesCommand } from './logout-all-devices.command.js';
import type { LogoutAllDevicesResult } from './logout-all-devices.result.js';

@Injectable()
export class LogoutAllDevicesHandler {
  constructor(
    @Inject(PLATFORM_AUTH_REPOSITORY) private readonly repository: PlatformAuthRepository,
  ) {}

  async execute(command: LogoutAllDevicesCommand): Promise<LogoutAllDevicesResult> {
    const revokedSessions = await this.repository.revokeAllSessions(
      command.adminId,
      'LOGOUT_ALL',
      new Date(),
    );
    await this.repository.recordAuditEvent({
      type: 'LOGOUT_ALL_DEVICES',
      adminId: command.adminId,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      metadata: { revokedSessions },
    });
    return { revokedSessions };
  }
}
