import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { WhatsAppInboxPage } from '@/features/admin/whatsapp/components/whatsapp-inbox-page';

export default function AdminWhatsAppInboxPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1400px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      }
    >
      <WhatsAppInboxPage />
    </Suspense>
  );
}
