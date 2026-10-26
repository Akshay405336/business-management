import { ProjectPlanningPage } from '@/features/admin/project-tasks/components/project-planning-page';

export default async function ProjectPlanRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectPlanningPage projectId={projectId} />;
}
