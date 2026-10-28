'use client';

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Menu,
  Plus,
  Search,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { initialsOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { useAdminSession } from '../hooks/use-admin-session';
import type { PlatformAdminProfile } from '../types/auth.types';

function normalizeLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Circular chevron — positioned half on sidebar / half on header by the shell layout. */
export function AdminHeaderSidebarToggle({
  sidebarCollapsed,
  onToggleSidebar,
  className,
  style,
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const Chevron = sidebarCollapsed ? ChevronRight : ChevronLeft;
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn(
        'admin-sidebar-edge-toggle rounded-full border-border bg-[#f3f4f6] shadow-none hover:bg-[#e8eaec]',
        className,
      )}
      style={style}
      onClick={onToggleSidebar}
      aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!sidebarCollapsed}
    >
      <Chevron className="text-foreground size-4 stroke-[2]" aria-hidden="true" />
    </Button>
  );
}

export function AdminAppHeader({
  title,
  admin,
  mobileNavTrigger,
}: {
  title: string;
  admin: PlatformAdminProfile;
  mobileNavTrigger: ReactNode;
}) {
  const { signOut, isSigningOut } = useAdminSession();
  const roleLabel = admin.role.replaceAll('_', ' ');
  const showRoleSubtitle = normalizeLabel(roleLabel) !== normalizeLabel(admin.displayName);

  return (
    <header
      data-admin-chrome
      className="admin-app-header bg-card relative z-20 flex h-14 min-w-0 shrink-0 items-center gap-3 px-3 sm:px-4 print:hidden"
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2.5 lg:pl-5">
        {mobileNavTrigger}
        <h1 className="text-foreground truncate text-base font-semibold">{title}</h1>
      </div>

      <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 px-2 md:flex">
        <form
          role="search"
          className="w-full max-w-md min-w-0"
          onSubmit={(event) => event.preventDefault()}
        >
          <InputGroup leading={<Search aria-hidden="true" />}>
            <Input
              type="search"
              name="global-search"
              placeholder="Search for anything..."
              autoComplete="off"
              className={cn(
                'border-input bg-background h-9 rounded-full text-sm shadow-none',
                inputGroupPaddingClass({ leading: true }),
              )}
              aria-label="Search"
            />
          </InputGroup>
        </form>
        <Button
          type="button"
          aria-label="Quick action"
          className="size-9 shrink-0 rounded-full bg-neutral-900 p-0 text-white shadow-none hover:bg-neutral-800"
        >
          <Plus className="size-[18px] stroke-[2.5]" aria-hidden="true" />
        </Button>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Help">
          <CircleHelp className="size-[18px]" aria-hidden="true" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-9 max-w-[14rem] gap-2 px-2 sm:px-2.5"
            >
              <span
                className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                aria-hidden="true"
              >
                {initialsOf(admin.displayName)}
              </span>
              <span className="hidden min-w-0 flex-col items-start text-left leading-tight sm:flex">
                <span className="text-foreground truncate text-sm font-medium">
                  {admin.displayName}
                </span>
                {showRoleSubtitle ? (
                  <span className="text-muted-foreground truncate text-xs capitalize">
                    {roleLabel}
                  </span>
                ) : null}
              </span>
              <ChevronDown className="text-muted-foreground hidden size-4 shrink-0 sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{admin.displayName}</span>
                <span className="text-muted-foreground text-xs">{admin.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isSigningOut}
              onSelect={() => void signOut()}
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AdminMobileNavTrigger({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn('lg:hidden', className)}
      aria-label="Open navigation"
      onClick={onClick}
    >
      <Menu className="size-[18px]" />
    </Button>
  );
}
