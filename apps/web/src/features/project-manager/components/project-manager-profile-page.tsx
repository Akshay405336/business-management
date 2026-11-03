'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { useAuthenticatedAdmin } from '@/features/admin/auth/hooks/use-admin-session';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { formatDateTime } from '@/shared/lib/format';

export function ProjectManagerProfilePage() {
  const { admin } = useAuthenticatedAdmin();
  const { membershipRoleLabel } = usePermissions();
  const { dashboardBreadcrumb } = usePortalNavigation();

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <AdminPageHeader
        breadcrumbs={[dashboardBreadcrumb, { label: 'Profile' }]}
        title="Profile"
        description="Your workspace identity for this organization."
      />

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed-in member profile.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Info label="Name" value={admin.displayName} />
          <Info label="Email" value={admin.email} />
          <Info label="Role" value={membershipRoleLabel} />
          <Info label="Last sign-in" value={formatDateTime(admin.lastLoginAt)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-medium" title={value}>
        {value}
      </p>
    </div>
  );
}
