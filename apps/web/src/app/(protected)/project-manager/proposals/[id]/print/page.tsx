import { redirect } from 'next/navigation';

export default async function ProjectManagerProposalPrintRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/project-manager/quotations/${id}/print`);
}
