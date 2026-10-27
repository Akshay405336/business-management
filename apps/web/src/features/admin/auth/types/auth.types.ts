import type { PlatformAdminProfile, PlatformSessionSummary } from '@techwin/contracts';
import type { ApiError } from '@/shared/api/api-error';

export type {
  PlatformAdminProfile,
  PlatformCurrentSessionResponse,
  PlatformLoginResponse,
  PlatformLogoutAllResponse,
  PlatformRefreshResponse,
  PlatformSessionListResponse,
  PlatformSessionSummary,
  PlatformVerifyTotpResponse,
} from '@techwin/contracts';

/** Why the user was sent back to the login page; shown as a notice there. */
export type LoginNoticeReason =
  | 'challenge_expired'
  | 'session_expired'
  | 'signed_out'
  | 'invitation_accepted';

export type AdminSessionState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'authenticated';
      readonly admin: PlatformAdminProfile;
      readonly session: PlatformSessionSummary;
    }
  /** The session could not be confirmed for a transient reason (offline, 5xx). */
  | { readonly status: 'error'; readonly error: ApiError }
  | { readonly status: 'unauthenticated' };
