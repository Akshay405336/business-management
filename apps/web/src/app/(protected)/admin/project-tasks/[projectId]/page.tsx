import { ProjectTaskBoardPage } from '@/features/admin/project-tasks/components/project-task-board-page';

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectTaskBoardPage projectId={projectId} />;
}
