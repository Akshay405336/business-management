import { Inject, Injectable } from '@nestjs/common';
import {
  PLATFORM_AUTH_REPOSITORY,
  type PlatformAuthRepository,
} from '../../domain/repositories/platform-auth.repository.js';
import { toPlatformSessionView } from '../get-current-session/get-current-session.result.js';
import type { ListSessionsQuery } from './list-sessions.query.js';
import type { ListSessionsResult } from './list-sessions.result.js';

@Injectable()
export class ListSessionsHandler {
  constructor(
    @Inject(PLATFORM_AUTH_REPOSITORY) private readonly repository: PlatformAuthRepository,
  ) {}

  async execute(query: ListSessionsQuery): Promise<ListSessionsResult> {
    const sessions = await this.repository.listActiveSessions(query.adminId, new Date());
    return {
      sessions: sessions.map((session) => toPlatformSessionView(session, query.currentSessionId)),
    };
  }
}
