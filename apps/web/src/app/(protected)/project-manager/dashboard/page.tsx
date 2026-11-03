import type { Metadata } from 'next';
import { AdminDashboard } from '@/features/admin/auth/components/admin-dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function ProjectManagerDashboardPage() {
  return <AdminDashboard />;
}
