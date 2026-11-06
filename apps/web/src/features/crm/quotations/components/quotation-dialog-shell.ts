import { cn } from '@/shared/lib/utils';
import { CRM_PIPELINE_FORM_DIALOG_CLASS } from '@/features/admin/crm/constants';

export {
  SERVICE_PACKAGE_FORM_DIALOG_CLASS as QUOTATION_FORM_DIALOG_CLASS,
  SERVICE_PACKAGE_MODAL_DIALOG_STYLE as QUOTATION_FORM_DIALOG_STYLE,
  SERVICE_PACKAGE_FORM_DIALOG_SCROLL_CLASS as QUOTATION_FORM_SCROLL_CLASS,
  SERVICE_PACKAGE_DIALOG_HEADER_CLASS as QUOTATION_FORM_HEADER_CLASS,
  SERVICE_PACKAGE_DIALOG_FOOTER_CLASS as QUOTATION_FORM_FOOTER_CLASS,
} from '@/features/crm/service-packages/components/service-package-dialog-shell';

export const QUOTATION_FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

export const QUOTATION_FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

/** Wider shell for send / read-only quotation modals (not create/edit form). */
const DIALOG_CLOSE_BUTTON_CLASS =
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50';

export const QUOTATION_MODAL_DIALOG_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  DIALOG_CLOSE_BUTTON_CLASS,
);

/**
 * Send quotation — PDF preview + email form side by side.
 * Must clear DialogContent defaults (`max-w-lg` / `sm:max-w-lg`); width is set inline too.
 */
export const QUOTATION_SEND_MODAL_DIALOG_CLASS = cn(
  '!flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0',
  'max-w-none sm:max-w-none',
  DIALOG_CLOSE_BUTTON_CLASS,
);

/** Full-width two-column body: preview | email */
export const QUOTATION_SEND_MODAL_SPLIT_CLASS =
  'grid min-h-0 w-full flex-1 grid-cols-2 overflow-hidden';

export const QUOTATION_SEND_MODAL_DIALOG_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'min(92vh, calc(100dvh - 2rem))',
  overflow: 'hidden',
  width: 'min(calc(100vw - 2rem), 1100px)',
  maxWidth: 'min(calc(100vw - 2rem), 1100px)',
} as const;

export const QUOTATION_MODAL_DIALOG_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'min(92vh, calc(100dvh - 2rem))',
  overflow: 'hidden',
} as const;

export const QUOTATION_MODAL_SCROLL_CLASS =
  'min-h-0 flex-1 basis-0 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-3';

/** Send modal — left preview pane (vertical scroll only; clip horizontal overflow). */
export const QUOTATION_SEND_MODAL_PREVIEW_PANE_CLASS =
  'bg-muted/15 flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden border-border border-r p-4';

export const QUOTATION_SEND_MODAL_PREVIEW_FRAME_CLASS =
  'bg-muted/30 relative min-h-[420px] w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto rounded-lg border shadow-sm';

/** Send modal — right email pane (scrolls independently). */
export const QUOTATION_SEND_MODAL_EMAIL_PANE_CLASS = cn(
  'flex h-full min-h-0 min-w-0 w-full flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-4',
  '[&_[data-slot=input]]:w-full [&_[data-slot=textarea]]:w-full',
);

export const QUOTATION_DETAILS_MODAL_CLASS = QUOTATION_MODAL_DIALOG_CLASS;
