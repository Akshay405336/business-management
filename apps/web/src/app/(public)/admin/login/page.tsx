import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminLoginForm } from '@/features/admin/auth/components/admin-login-form';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
