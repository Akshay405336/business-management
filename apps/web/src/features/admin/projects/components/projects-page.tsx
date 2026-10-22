'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy entry — `/admin/projects` redirects server-side; this covers direct imports. */
export function ProjectsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/project-tasks');
  }, [router]);
  return null;
}
