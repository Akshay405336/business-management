'use client';

import { proposalListQuerySchema } from '@techwin/validation';
import { ExternalLink, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { cn } from '@/shared/lib/utils';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { CRM_PROPOSALS_TABLE_SKELETON } from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { deleteProposal, getProposal, listProposals } from '../api/proposals';
import { PROPOSAL_STATUSES } from '../constants';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import type { CrmProposal, ProposalListQuery, ProposalStatus } from '../types';
import { describeCrmError } from '../utils/errors';
import { formatDateOnly, formatMoney } from '../utils/format';
import { labelProposalStatus, labelProposalType } from '../utils/labels';
import { CrmErrorAlert } from './crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from './crm-toolbar-header';
import { ProposalFormDialog } from './proposal-form-dialog';
import { ProposalStatusBadge } from './proposal-status-badge';
import { ProposalViewDialog } from './proposal-view-dialog';
import { useAsyncAction } from '../hooks/use-async-action';

const SEARCH_DEBOUNCE_MS = 400;

export function ProposalsPage() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();

  const [proposals, setProposals] = useState<readonly CrmProposal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProposalStatus>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewProposal, setViewProposal] = useState<CrmProposal | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CrmProposal | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useMemo((): ProposalListQuery => {
    const candidate: ProposalListQuery = {
      search: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page,
      pageSize,
    };
    const parsed = proposalListQuerySchema.safeParse(candidate);
    return parsed.success ? parsed.data : { page: 1, pageSize: 10 };
  }, [search, statusFilter, page, pageSize]);

  const filtersActive = search.trim().length > 0 || statusFilter !== 'ALL';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listProposals(query);
      setProposals(result.items);
      setTotal(result.total);
      setError(null);
    } catch (failure) {
      setError(describeCrmError(failure));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    if (searchDraft === search) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: proposals.length,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: proposals.length });

  const openCreate = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setViewOpen(false);
    setFormOpen(true);
  };

  const openView = async (id: string) => {
    setViewOpen(true);
    setViewProposal(null);
    setViewLoading(true);
    try {
      const proposal = await getProposal(id);
      setViewProposal(proposal);
    } catch (failure) {
      toast.error(describeCrmError(failure));
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await run(() => deleteProposal(target.id));
      toast.success(`Draft "${target.documentNumber}" deleted.`);
      if (viewProposal?.id === target.id) {
        setViewOpen(false);
        setViewProposal(null);
      }
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setPage(1);
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'CRM' },
    { label: 'Proposals & Quotations' },
  ] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <CrmToolbarHeader
        title="Proposals & Quotations"
        description="Create professional quotations."
        className="shadow-xs"
        titleSectionClassName="xl:max-w-none xl:min-w-0 xl:flex-[1_1_auto]"
        descriptionClassName="xl:whitespace-nowrap"
        toolbar={
          <>
            <form
              className={CRM_HEADER_SEARCH_FORM_CLASS}
              onSubmit={(event) => {
                event.preventDefault();
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                setSearch(searchDraft.trim());
                setPage(1);
              }}
            >
              <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 max-w-full">
                <Input
                  className={cn('h-9', inputGroupPaddingClass({ leading: true }))}
                  placeholder={CRM_FORM_PLACEHOLDERS.searchProposals}
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  aria-label="Search proposals"
                />
              </InputGroup>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'ALL' | ProposalStatus)}
            >
              <SelectTrigger
                className="h-9 w-full min-w-0 sm:w-[9.375rem] sm:max-w-[10rem]"
                aria-label="Filter by status"
              >
                <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.filterStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {PROPOSAL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {labelProposalStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" className="h-9 shrink-0" onClick={openCreate}>
              <Plus aria-hidden="true" />
              New quotation
            </Button>
          </>
        }
      />

      {error && proposals.length > 0 ? <CrmErrorAlert message={error} /> : null}

      <DataTable
        className="min-w-0 max-w-full"
        tableClassName="table-fixed"
        phase={tablePhase}
        colSpan={7}
        skeletonColumns={CRM_PROPOSALS_TABLE_SKELETON}
        header={
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[26%]">Document</TableHead>
            <TableHead className="w-[18%]">Client</TableHead>
            <TableHead className="w-[10%]">Type</TableHead>
            <TableHead className="w-[12%]">Issue date</TableHead>
            <TableHead className="w-[12%] text-right">Grand total</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-[12%] text-right">Actions</TableHead>
          </TableRow>
        }
        empty={{
          title: filtersActive ? 'No results match your filters' : 'No documents yet',
          description: filtersActive
            ? 'Try different search terms or clear filters to see all documents.'
            : 'Create a quotation or proposal with line items and client details.',
          secondaryAction: filtersActive
            ? { label: 'Clear filters', onClick: clearFilters }
            : undefined,
        }}
        errorMessage={error}
        onRetry={() => void load()}
        refreshing={tableRefreshing}
        footer={
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            loading={tablePhase === 'initial-loading'}
            hideWhenEmpty={false}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        }
      >
        {proposals.map((proposal) => (
          <TableRow key={proposal.id}>
            <TableCell className="min-w-0">
              <div className="grid min-w-0">
                <span className="truncate font-medium">{proposal.title}</span>
                <span className="text-muted-foreground truncate text-xs">{proposal.documentNumber}</span>
              </div>
            </TableCell>
            <TableCell className="min-w-0 truncate">{proposal.clientName}</TableCell>
            <TableCell className="truncate">{labelProposalType(proposal.type)}</TableCell>
            <TableCell className="text-muted-foreground whitespace-nowrap">
              {formatDateOnly(proposal.issueDate)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(proposal.grandTotal, 'INR')}
            </TableCell>
            <TableCell>
              <ProposalStatusBadge status={proposal.status} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-0.5">
                <TableIconButton
                  label={`View ${proposal.documentNumber}`}
                  onClick={() => void openView(proposal.id)}
                >
                  <Eye className="size-4" aria-hidden="true" />
                </TableIconButton>
                {proposal.status === 'DRAFT' ? (
                  <TableIconButton
                    label={`Edit draft ${proposal.documentNumber}`}
                    tone="primary"
                    disabled={pending}
                    onClick={() => openEdit(proposal.id)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </TableIconButton>
                ) : null}
                {proposal.status === 'DRAFT' ? (
                  <TableIconButton
                    label={`Delete draft ${proposal.documentNumber}`}
                    tone="danger"
                    disabled={pending}
                    onClick={() => setDeleteTarget(proposal)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </TableIconButton>
                ) : null}
                <TableIconButton label={`Print ${proposal.documentNumber}`} asChild>
                  <Link href={`/admin/proposals/${proposal.id}/print`} target="_blank">
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </Link>
                </TableIconButton>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>

      <ProposalFormDialog
        open={formOpen}
        editingId={editingId}
        onOpenChange={setFormOpen}
        onSaved={load}
      />

      <ProposalViewDialog
        open={viewOpen}
        proposal={viewProposal}
        loading={viewLoading}
        onOpenChange={setViewOpen}
        onEdit={openEdit}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft document?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Permanently delete draft ${deleteTarget.documentNumber}? This cannot be undone.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
