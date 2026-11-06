import { Badge } from '@/components/ui/badge';
import type { QuotationStatus } from '../types/quotation.types';
import { isQuotationWorkflowStatus, labelQuotationStatus } from '../utils/quotation.utils';

const tone: Record<'DRAFT' | 'SENT' | 'EXPIRED', string> = {
  DRAFT: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
  SENT: 'bg-sky-100 text-sky-900 hover:bg-sky-100',
  EXPIRED: 'bg-amber-100 text-amber-900 hover:bg-amber-100',
};

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  if (!isQuotationWorkflowStatus(status)) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  return (
    <Badge variant="secondary" className={tone[status]}>
      {labelQuotationStatus(status)}
    </Badge>
  );
}
