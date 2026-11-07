'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  QUOTATION_FORM_DIALOG_CLASS,
  QUOTATION_FORM_DIALOG_STYLE,
  QUOTATION_FORM_HEADER_CLASS,
} from '@/features/crm/quotations/components/quotation-dialog-shell';
import { AttendanceSettingsPanel } from './attendance-settings-panel';

export function AttendanceSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={QUOTATION_FORM_DIALOG_CLASS} style={QUOTATION_FORM_DIALOG_STYLE}>
        <DialogHeader className={QUOTATION_FORM_HEADER_CLASS}>
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            Attendance settings
          </DialogTitle>
        </DialogHeader>
        {open ? <AttendanceSettingsPanel /> : null}
      </DialogContent>
    </Dialog>
  );
}
