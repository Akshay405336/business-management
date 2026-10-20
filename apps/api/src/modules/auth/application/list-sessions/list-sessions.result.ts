import type { PlatformSessionView } from '../get-current-session/get-current-session.result.js';

export interface ListSessionsResult {
  readonly sessions: readonly PlatformSessionView[];
}
