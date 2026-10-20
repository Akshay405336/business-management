'use client';

import { XIcon } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';

function Sheet(props: ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({
  className,
  children,
  side = 'left',
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & { side?: 'left' | 'right' }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-slate-900/40"
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'bg-card data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-y-0 z-50 flex h-full w-[min(18rem,85vw)] flex-col shadow-xl transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
          side === 'left'
            ? 'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left left-0 border-r'
            : 'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right right-0 border-l',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-3.5 right-3 rounded-md p-1.5 outline-none focus-visible:ring-[3px]">
          <XIcon className="size-4" aria-hidden="true" />
          <span className="sr-only">Close navigation</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-semibold', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger };
