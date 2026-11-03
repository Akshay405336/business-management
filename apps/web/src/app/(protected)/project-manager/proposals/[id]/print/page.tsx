import { ProposalPrintPage } from '@/features/admin/crm/components/proposal-print-page';

export default async function ProjectManagerProposalPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProposalPrintPage proposalId={id} />;
}
