import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { WhatsAppBroadcastsPage } from '@/features/admin/whatsapp/components/whatsapp-broadcasts-page';

export default function AdminWhatsAppBroadcastsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1400px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <WhatsAppBroadcastsPage />
    </Suspense>
  );
}
