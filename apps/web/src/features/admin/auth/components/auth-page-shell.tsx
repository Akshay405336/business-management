import type { ReactNode } from 'react';
import { TechwinLogo } from '@/shared/components/techwin-logo';

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-dvh flex-col items-center px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-[420px] flex-1 flex-col justify-center">
        <TechwinLogo subtitle="Platform administration" className="mb-8" />
        <div className="bg-card rounded-xl border px-6 py-8 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_8px_24px_-8px_rgb(15_23_42/0.08)] sm:px-8">
          {children}
        </div>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          Restricted system. Access is limited to authorized platform administrators and is audited.
        </p>
      </div>
    </div>
  );
}
