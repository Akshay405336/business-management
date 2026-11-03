import type { Metadata } from 'next';
import { ProjectManagerProfilePage } from '@/features/project-manager/components/project-manager-profile-page';

export const metadata: Metadata = {
  title: 'Profile',
};

export default function ProjectManagerProfileRoute() {
  return <ProjectManagerProfilePage />;
}
