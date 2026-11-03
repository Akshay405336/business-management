import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlatformLoginForm } from '@/features/admin/auth/components/platform-login-form';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function LoginPage() {
  return (
    <Suspense>
      <PlatformLoginForm />
    </Suspense>
  );
}
