'use client';

import { createContext, useContext } from 'react';
import type {
  AdminSessionState,
  PlatformAdminProfile,
  PlatformSessionSummary,
} from '../types/auth.types';

export interface AdminSessionContextValue {
  readonly state: AdminSessionState;
  /** Re-runs session restoration, e.g. after a transient failure. */
  readonly reload: () => void;
  readonly signOut: () => Promise<void>;
  readonly signOutEverywhere: () => Promise<void>;
  readonly isSigningOut: boolean;
}

export const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function useAdminSession(): AdminSessionContextValue {
  const context = useContext(AdminSessionContext);
  if (!context) throw new Error('useAdminSession must be used inside <AdminSessionProvider>.');
  return context;
}

/** For components that only render once the session is confirmed. */
export function useAuthenticatedAdmin(): {
  admin: PlatformAdminProfile;
  session: PlatformSessionSummary;
} {
  const { state } = useAdminSession();
  if (state.status !== 'authenticated') {
    throw new Error('useAuthenticatedAdmin requires an authenticated session.');
  }
  return { admin: state.admin, session: state.session };
}
