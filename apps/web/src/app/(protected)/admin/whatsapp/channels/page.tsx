import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { WhatsAppChannelsPage } from '@/features/admin/whatsapp/components/whatsapp-channels-page';

export default function AdminWhatsAppChannelsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1400px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <WhatsAppChannelsPage />
    </Suspense>
  );
}
