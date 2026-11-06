import { redirect } from 'next/navigation';

export default async function AdminProposalPrintRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/quotations/${id}/print`);
}
