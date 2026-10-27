import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AcceptInvitationForm } from '@/features/admin/org-access/components/accept-invitation-form';

export const metadata: Metadata = {
  title: 'Accept invitation',
};

export default function AcceptInvitePage() {
  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Join your organization</h1>
        <p className="text-muted-foreground text-sm">
          Set your display name and password to activate your Techwin administrator account.
        </p>
      </header>
      <Suspense>
        <AcceptInvitationForm />
      </Suspense>
    </div>
  );
}
