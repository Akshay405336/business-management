import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TotpVerificationForm } from '@/features/admin/auth/components/totp-verification-form';
import { VerifyTotpGate } from '@/features/admin/auth/components/verify-totp-gate';

export const metadata: Metadata = {
  title: 'Verify your identity',
};

export default function AdminVerifyTotpPage() {
  return (
    <Suspense>
      <VerifyTotpGate>
        <TotpVerificationForm />
      </VerifyTotpGate>
    </Suspense>
  );
}
