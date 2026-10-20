import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TotpVerificationForm } from '@/features/admin/auth/components/totp-verification-form';

export const metadata: Metadata = {
  title: 'Verify your identity',
};

export default function AdminVerifyTotpPage() {
  return (
    <Suspense>
      <TotpVerificationForm />
    </Suspense>
  );
}
