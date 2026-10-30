import { redirect } from 'next/navigation';

export default function AdminMyTasksRedirectPage() {
  redirect('/admin/daily-tasks?workspace=my');
}
