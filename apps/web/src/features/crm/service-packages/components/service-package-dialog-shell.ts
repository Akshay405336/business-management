import { cn } from '@/shared/lib/utils';
import { CRM_PIPELINE_FORM_DIALOG_CLASS } from '@/features/admin/crm/constants';

/** Radix close control styling (matches Pipeline / Lead modals). */
const DIALOG_CLOSE_BUTTON_CLASS =
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50';

/** Shared width for create, edit, and view package modals (slightly wider than pipeline 720px). */
const SERVICE_PACKAGE_MODAL_WIDTH_CLASS =
  'w-[min(752px,calc(100vw-2rem))] max-w-[752px] sm:w-[752px] sm:max-w-[752px]';

const SERVICE_PACKAGE_MODAL_VIEWPORT_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  SERVICE_PACKAGE_MODAL_WIDTH_CLASS,
  'max-h-[calc(100dvh-2rem)] overscroll-contain',
  DIALOG_CLOSE_BUTTON_CLASS,
);

/** View package details — centered, viewport-bound, scrollable body. */
export const SERVICE_PACKAGE_DETAILS_DIALOG_CLASS = SERVICE_PACKAGE_MODAL_VIEWPORT_CLASS;

/** Create / edit package form — same shell as details. */
export const SERVICE_PACKAGE_FORM_DIALOG_CLASS = SERVICE_PACKAGE_MODAL_VIEWPORT_CLASS;

/** Inline flex + max-height (DialogContent defaults to grid; flex middle must scroll). */
export const SERVICE_PACKAGE_MODAL_DIALOG_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'min(92vh, calc(100dvh - 2rem))',
  overflow: 'hidden',
} as const;

/** Scroll region for form and details modals (flex middle). */
export const SERVICE_PACKAGE_FORM_DIALOG_SCROLL_CLASS =
  'min-h-0 flex-1 basis-0 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-3';

/** @deprecated Use SERVICE_PACKAGE_FORM_DIALOG_SCROLL_CLASS */
export const SERVICE_PACKAGE_DIALOG_SCROLL_CLASS = SERVICE_PACKAGE_FORM_DIALOG_SCROLL_CLASS;

export const SERVICE_PACKAGE_DIALOG_HEADER_CLASS =
  'border-border/60 shrink-0 space-y-0 border-b px-6 pt-6 pb-3 text-left';

export const SERVICE_PACKAGE_DIALOG_FOOTER_CLASS =
  'border-border/60 shrink-0 flex-wrap gap-2 border-t px-6 py-4 sm:justify-end';
