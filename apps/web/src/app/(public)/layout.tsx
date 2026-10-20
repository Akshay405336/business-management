import type { ReactNode } from 'react';
import { AuthPageShell } from '@/features/admin/auth/components/auth-page-shell';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <AuthPageShell>{children}</AuthPageShell>;
}
