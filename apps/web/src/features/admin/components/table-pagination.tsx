import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/shared/lib/utils';

export const TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const paginationNavButtonClass =
  'border-input bg-card text-foreground hover:bg-muted/50 shadow-none';

const paginationActivePageClass =
  'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white';

function buildPageList(page: number, totalPages: number): readonly (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  for (let index = 0; index < sorted.length; index++) {
    const current = sorted[index];
    if (current === undefined) continue;
    const previous = sorted[index - 1];
    if (index > 0 && previous !== undefined && current - previous > 1) {
      result.push('ellipsis');
    }
    result.push(current);
  }
  return result;
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
  loading = false,
  hideWhenEmpty = true,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  loading?: boolean;
  hideWhenEmpty?: boolean;
  className?: string;
}) {
  if (hideWhenEmpty && total === 0 && !loading) {
    return null;
  }

  const totalPages = total === 0 ? 0 : Math.max(1, Math.ceil(total / pageSize));
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);
  const pageList = totalPages === 0 ? [] : buildPageList(safePage, totalPages);

  if (loading && total === 0) {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
          className,
        )}
        aria-busy="true"
        aria-label="Loading pagination"
      >
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm whitespace-nowrap">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger size="sm" className="h-8 w-[4.5rem]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <p className="text-muted-foreground text-sm">
          {`Showing ${start}–${end} of ${total}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(paginationNavButtonClass, 'hidden sm:inline-flex')}
          disabled={safePage <= 1 || total === 0}
          aria-label="First page"
          onClick={() => onPageChange(1)}
        >
          <ChevronFirst className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={paginationNavButtonClass}
          disabled={safePage <= 1 || total === 0}
          aria-label="Previous page"
          onClick={() => onPageChange(safePage - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Button>
        <div className="flex items-center gap-1 px-0.5">
          {pageList.map((item, index) =>
            item === 'ellipsis' ? (
              <Button
                key={`ellipsis-${index}`}
                type="button"
                variant="outline"
                size="sm"
                className={cn(paginationNavButtonClass, 'min-w-8 px-2')}
                disabled
                aria-hidden
                tabIndex={-1}
              >
                …
              </Button>
            ) : (
              <Button
                key={item}
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'min-w-8 px-2',
                  item === safePage ? paginationActivePageClass : paginationNavButtonClass,
                )}
                aria-label={`Page ${item}`}
                aria-current={item === safePage ? 'page' : undefined}
                disabled={total === 0}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            ),
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={paginationNavButtonClass}
          disabled={safePage >= totalPages || total === 0}
          aria-label="Next page"
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(paginationNavButtonClass, 'hidden sm:inline-flex')}
          disabled={safePage >= totalPages || total === 0}
          aria-label="Last page"
          onClick={() => onPageChange(totalPages)}
        >
          <ChevronLast className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
