import { QuotationPrintPage } from '@/features/crm/quotations';

export default async function AdminQuotationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-4 md:p-6">
      <QuotationPrintPage quotationId={id} />
    </div>
  );
}
