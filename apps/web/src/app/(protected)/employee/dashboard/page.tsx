import type { Metadata } from 'next';
import { EmployeeDashboard } from '@/features/employee/components/employee-dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function EmployeeDashboardPage() {
  return <EmployeeDashboard />;
}
