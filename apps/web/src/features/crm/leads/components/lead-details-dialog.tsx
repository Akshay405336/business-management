'use client';

import { AlertCircle, Loader2, Pencil, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/features/admin/components/priority-badge';
import { useAdminToast } from '@/features/admin/components/toast';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { cn } from '@/shared/lib/utils';
import {
  convertLead,
  createLeadActivity,
  getLead,
  linkLeadToClient,
  listLeadActivities,
} from '../api/lead.api';
import {
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '../utils/lead-constants';
import { CRM_FORM_PLACEHOLDERS } from '../utils/form-placeholders';
import { ACTIVITY_TYPES } from '../utils/lead-constants';
import type { CrmDuplicateClientSummary } from '@techwin/contracts';
import { API_ERROR_CODES } from '@techwin/contracts';
import { ApiError } from '@/shared/api/api-error';
import type {
  CrmLead,
  CrmLeadActivity,
  CrmPipeline,
  LeadActivityType,
} from '../types/lead.types';
import { dateTimeLocalToIso, formatMoney, toDateInputValue, toDateTimeLocalValue } from '../utils/format';
import { describeCrmError } from '../utils/errors';
import { labelActivityType, labelLeadPriority, labelLeadSource } from '../utils/labels';
import { labelClientType } from '@/features/admin/crm/utils/labels';
import { formatDateTime } from '@/shared/lib/format';
import {
  LEAD_FORM_DIALOG_SHELL_CLASS,
  LEAD_FORM_PRIMARY_BTN,
  LEAD_FORM_SECONDARY_BTN,
  LEAD_FORM_SELECT_TRIGGER_CLASS,
} from './lead-form-dialog';
import { CrmEmptyState, CrmErrorAlert, CrmFieldLabel, CrmLoadingRows } from '@/features/admin/crm/components/crm-feedback';
import { LeadTagBadge } from './lead-tag-badge';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export type LeadDetailMode = 'view' | 'edit';

function ReadOnlyField({ value }: { value: string }) {
  return (
    <div
      className={cn(
        CRM_PIPELINE_FORM_FIELD_CLASS,
        'text-foreground flex min-h-11 items-center px-3 text-sm',
      )}
    >
      <span className="truncate">{value.trim() ? value : '—'}</span>
    </div>
  );
}

function leadHasMoreDetails(lead: CrmLead): boolean {
  return (
    Boolean(lead.companyName?.trim()) ||
    Boolean(lead.website?.trim()) ||
    lead.tags.length > 0 ||
    Boolean(lead.description?.trim()) ||
    Boolean(lead.expectedCloseDate) ||
    Boolean(lead.nextFollowUpDate) ||
    lead.source !== 'WEBSITE' ||
    lead.priority !== 'MEDIUM' ||
    (lead.estimatedValue.trim() !== '' && lead.estimatedValue.trim() !== '0')
  );
}

export function LeadDetailsDialog({
  leadId,
  mode,
  pipelines,
  open,
  onOpenChange,
  onUpdated,
  onEditLead,
}: {
  leadId: string | null;
  mode: LeadDetailMode;
  pipelines: readonly CrmPipeline[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onEditLead?: (leadId: string) => void;
}) {
  const toast = useAdminToast();
  const { toPortalPath } = usePortalNavigation();
  const clientsHref = toPortalPath('/admin/clients');
  const [lead, setLead] = useState<CrmLead | null>(null);
  const [activities, setActivities] = useState<readonly CrmLeadActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const { pending: convertPending, run: runConvert } = useAsyncAction();
  const { pending: activityPending, run: runActivity } = useAsyncAction();

  const [activityType, setActivityType] = useState<LeadActivityType>('NOTE');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityOccurredAt, setActivityOccurredAt] = useState('');
  const [duplicateClient, setDuplicateClient] = useState<CrmDuplicateClientSummary | null>(null);
  const [phoneRequiredNotice, setPhoneRequiredNotice] = useState(false);
  const convertInFlight = useRef(false);

  const pipeline = pipelines.find((item) => item.id === lead?.pipelineId);
  const stages = useMemo(
    () =>
      [...(pipeline?.stages ?? [])]
        .filter((stage) => stage.status === 'ACTIVE')
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [pipeline?.stages],
  );

  const stageName = lead
    ? (stages.find((stage) => stage.id === lead.stageId)?.name ?? '—')
    : '—';

  useEffect(() => {
    if (!open || !leadId || mode === 'edit') return;

    const controller = new AbortController();
    void (async () => {
      try {
        const [leadResult, activityResult] = await Promise.all([
          getLead(leadId, controller.signal),
          listLeadActivities(leadId, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setLead(leadResult);
        setShowMoreDetails(leadHasMoreDetails(leadResult));
        setActivities(activityResult.activities);
        setError(null);
        setActivityOccurredAt(toDateTimeLocalValue(new Date().toISOString()));
      } catch (failure) {
        if (!controller.signal.aborted) setError(describeCrmError(failure));
      }
    })();
    return () => controller.abort();
  }, [leadId, open, mode]);

  useEffect(() => {
    if (!open) {
      setPhoneRequiredNotice(false);
      setDuplicateClient(null);
    }
  }, [open]);

  const logActivity = async () => {
    if (!lead || !activityTitle.trim() || !activityOccurredAt) return;
    setError(null);
    try {
      const created = await runActivity(() =>
        createLeadActivity(lead.id, {
          type: activityType,
          title: activityTitle.trim(),
          description: activityDescription.trim() || undefined,
          occurredAt: dateTimeLocalToIso(activityOccurredAt),
        }),
      );
      if (created) {
        setActivities((current) => [created, ...(current ?? [])]);
        setActivityTitle('');
        setActivityDescription('');
        toast.success('Activity logged.');
        onUpdated();
      }
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const convert = async () => {
    if (!lead || lead.convertedClientId || convertInFlight.current) return;
    setDuplicateClient(null);
    const rawPhone = lead.phone?.trim() ?? '';
    if (!rawPhone) {
      setPhoneRequiredNotice(true);
      setError(null);
      toast.error('Phone number required');
      return;
    }
    setPhoneRequiredNotice(false);
    setError(null);
    convertInFlight.current = true;
    try {
      const result = await runConvert(() => convertLead(lead.id));
      if (result) {
        setLead(result.lead);
        if (result.duplicateClient) {
          setDuplicateClient(result.duplicateClient);
        } else if (result.client) {
          toast.success('Lead converted to client.');
          onUpdated();
        }
      }
    } catch (failure) {
      const msg = describeCrmError(failure);
      if (
        failure instanceof ApiError &&
        failure.code === API_ERROR_CODES.VALIDATION_FAILED &&
        msg.toLowerCase().includes('phone')
      ) {
        setPhoneRequiredNotice(true);
        setError(null);
      }
      toast.error(msg);
    } finally {
      convertInFlight.current = false;
    }
  };

  const linkToExistingClient = async () => {
    if (!lead || !duplicateClient || convertInFlight.current) return;
    setError(null);
    convertInFlight.current = true;
    try {
      const result = await runConvert(() =>
        linkLeadToClient(lead.id, { clientId: duplicateClient.id }),
      );
      if (result) {
        setLead(result.lead);
        setDuplicateClient(null);
        toast.success('Lead linked to existing client.');
        onUpdated();
      }
    } catch (failure) {
      toast.error(describeCrmError(failure));
    } finally {
      convertInFlight.current = false;
    }
  };

  if (mode === 'edit') return null;

  return (
    <Fragment>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={leadId ?? 'view'}
        className={cn(
          LEAD_FORM_DIALOG_SHELL_CLASS,
          'flex max-w-[640px] flex-col gap-0 p-0 sm:max-w-[640px]',
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            Lead details
          </DialogTitle>
          {pipeline ? (
            <p className="text-muted-foreground pt-1 text-sm">
              In pipeline <span className="text-foreground font-medium">{pipeline.name}</span>
            </p>
          ) : null}
          {lead ? (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant="secondary">{lead.referenceNumber}</Badge>
              <PriorityBadge priority={lead.priority} />
              {lead.convertedClientId ? <Badge variant="success">Converted</Badge> : null}
            </div>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          {phoneRequiredNotice ? (
            <div className="mb-4">
              <Alert variant="destructive" role="alert">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>
                  <p className="text-foreground font-semibold">Phone number required</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Please add a valid phone number to this Lead before converting it into a Client.
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          ) : null}
          {error ? (
            <div className="mb-4">
              <CrmErrorAlert message={error} />
            </div>
          ) : null}

          {!lead && open ? <CrmLoadingRows rows={5} /> : null}

          {lead ? (
            <div className="grid gap-4 pb-2">
              <div className="grid gap-2">
                <CrmFieldLabel>Full name</CrmFieldLabel>
                <ReadOnlyField value={lead.fullName} />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="grid gap-2">
                  <CrmFieldLabel>Email</CrmFieldLabel>
                  <ReadOnlyField value={lead.email ?? ''} />
                </div>
                <div className="grid gap-2">
                  <CrmFieldLabel>Phone</CrmFieldLabel>
                  <ReadOnlyField value={lead.phone ?? ''} />
                </div>
              </div>

              <div className="grid gap-2">
                <CrmFieldLabel>Stage</CrmFieldLabel>
                <ReadOnlyField value={stageName} />
              </div>

              {!showMoreDetails ? (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    className={LEAD_FORM_SECONDARY_BTN}
                    onClick={() => setShowMoreDetails(true)}
                  >
                    Show more details
                  </Button>
                </div>
              ) : null}

              {showMoreDetails ? (
                <>
                  <div className="grid gap-2">
                    <CrmFieldLabel>Company</CrmFieldLabel>
                    <ReadOnlyField value={lead.companyName ?? ''} />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                    <div className="grid gap-2">
                      <CrmFieldLabel>Source</CrmFieldLabel>
                      <ReadOnlyField value={labelLeadSource(lead.source)} />
                    </div>
                    <div className="grid gap-2">
                      <CrmFieldLabel>Priority</CrmFieldLabel>
                      <ReadOnlyField value={labelLeadPriority(lead.priority)} />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                    <div className="grid gap-2">
                      <CrmFieldLabel>Estimated value</CrmFieldLabel>
                      <ReadOnlyField value={formatMoney(lead.estimatedValue, lead.currency)} />
                    </div>
                    <div className="grid gap-2">
                      <CrmFieldLabel>Website</CrmFieldLabel>
                      <ReadOnlyField value={lead.website ?? ''} />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                    <div className="grid gap-2">
                      <CrmFieldLabel>Expected close date</CrmFieldLabel>
                      <ReadOnlyField value={toDateInputValue(lead.expectedCloseDate) || ''} />
                    </div>
                    <div className="grid gap-2">
                      <CrmFieldLabel>Next follow-up</CrmFieldLabel>
                      <ReadOnlyField
                        value={
                          lead.nextFollowUpDate ? formatDateTime(lead.nextFollowUpDate) : ''
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <CrmFieldLabel>Tags</CrmFieldLabel>
                    {(lead.leadTags?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.leadTags.map((tag) => (
                          <LeadTagBadge key={tag.id} tag={tag} />
                        ))}
                      </div>
                    ) : (
                      <ReadOnlyField value="" />
                    )}
                  </div>

                  <div className="grid gap-2">
                    <CrmFieldLabel>Description</CrmFieldLabel>
                    <div
                      className={cn(
                        CRM_PIPELINE_FORM_TEXTAREA_CLASS,
                        'text-foreground min-h-[5rem] px-3 py-2 text-sm whitespace-pre-wrap',
                      )}
                    >
                      {lead.description?.trim() ? lead.description : '—'}
                    </div>
                  </div>
                </>
              ) : null}

              <p className="text-muted-foreground text-xs">
                Last activity {formatDateTime(lead.lastActivityAt)}
              </p>

              <section className="border-border/60 grid gap-3 border-t pt-4">
                <h2 className="text-foreground text-sm font-semibold">Activity</h2>
                <div className="grid gap-3 rounded-lg bg-[#f7faff]/60 p-3">
                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                    <div className="grid gap-2">
                      <CrmFieldLabel htmlFor="activity-type">Type</CrmFieldLabel>
                      <Select
                        value={activityType}
                        onValueChange={(value) => setActivityType(value as LeadActivityType)}
                      >
                        <SelectTrigger id="activity-type" className={LEAD_FORM_SELECT_TRIGGER_CLASS}>
                          <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectType} />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIVITY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {labelActivityType(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <CrmFieldLabel htmlFor="activity-when">When</CrmFieldLabel>
                      <Input
                        id="activity-when"
                        type="datetime-local"
                        value={activityOccurredAt}
                        className={CRM_PIPELINE_FORM_FIELD_CLASS}
                        onChange={(event) => setActivityOccurredAt(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="activity-title">Title</CrmFieldLabel>
                    <Input
                      id="activity-title"
                      placeholder={CRM_FORM_PLACEHOLDERS.activityTitle}
                      value={activityTitle}
                      className={CRM_PIPELINE_FORM_FIELD_CLASS}
                      onChange={(event) => setActivityTitle(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="activity-description">Notes</CrmFieldLabel>
                    <Textarea
                      id="activity-description"
                      placeholder={CRM_FORM_PLACEHOLDERS.activityDescription}
                      value={activityDescription}
                      className={CRM_PIPELINE_FORM_TEXTAREA_CLASS}
                      onChange={(event) => setActivityDescription(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className={LEAD_FORM_SECONDARY_BTN}
                    disabled={activityPending || !activityTitle.trim()}
                    onClick={() => void logActivity()}
                  >
                    {activityPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    Log activity
                  </Button>
                </div>

                {activities === null ? <CrmLoadingRows rows={2} /> : null}
                {activities?.length === 0 ? (
                  <CrmEmptyState
                    title="No activity yet"
                    description="Log calls, emails, and notes here."
                  />
                ) : null}
                <ol className="grid gap-2">
                  {activities?.map((activity) => (
                    <li
                      key={activity.id}
                      className="border-border/60 rounded-lg border bg-card px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{activity.title}</p>
                        <span className="text-muted-foreground text-xs">
                          {labelActivityType(activity.type)}
                        </span>
                      </div>
                      {activity.description ? (
                        <p className="text-muted-foreground mt-1 text-xs">{activity.description}</p>
                      ) : null}
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatDateTime(activity.occurredAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          ) : null}
        </div>

        {lead ? (
          <DialogFooter className="shrink-0 flex-wrap gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className={LEAD_FORM_SECONDARY_BTN}
              onClick={() => {
                setDuplicateClient(null);
                onOpenChange(false);
              }}
            >
              Close
            </Button>
            {onEditLead && !lead.convertedClientId ? (
              <Button
                type="button"
                variant="outline"
                className={LEAD_FORM_SECONDARY_BTN}
                onClick={() => {
                  setDuplicateClient(null);
                  onOpenChange(false);
                  onEditLead(lead.id);
                }}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Edit lead
              </Button>
            ) : null}
            {lead.convertedClientId ? (
              <Button type="button" className={cn('h-11 px-5', LEAD_FORM_PRIMARY_BTN)} asChild>
                <Link href={`${clientsHref}?clientId=${lead.convertedClientId}`}>
                  View client
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                className={cn('h-11 px-5', LEAD_FORM_PRIMARY_BTN)}
                disabled={convertPending}
                onClick={() => void convert()}
              >
                {convertPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UserCheck className="size-4" aria-hidden="true" />
                )}
                Convert to client
              </Button>
            )}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>

      <AlertDialog
        open={duplicateClient !== null}
        onOpenChange={(open) => {
          if (!open) setDuplicateClient(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Client already exists!</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid gap-3 text-left">
                <p>A client with this phone number is already registered.</p>
                {duplicateClient ? (
                  <dl className="border-border/60 grid gap-2 rounded-md border bg-muted/30 px-3 py-3 text-sm">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
                      <dt className="text-muted-foreground">Name</dt>
                      <dd className="font-medium">{duplicateClient.name}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
                      <dt className="text-muted-foreground">Reference</dt>
                      <dd className="font-mono font-medium">{duplicateClient.referenceNumber}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="font-medium">{labelClientType(duplicateClient.type)}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd className="font-medium">{duplicateClient.phone ?? '—'}</dd>
                    </div>
                  </dl>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              className={LEAD_FORM_SECONDARY_BTN}
              disabled={convertPending}
            >
              Cancel
            </AlertDialogCancel>
            {duplicateClient ? (
              <Button type="button" variant="outline" className={LEAD_FORM_SECONDARY_BTN} asChild>
                <Link href={`${clientsHref}?clientId=${duplicateClient.id}`}>View existing client</Link>
              </Button>
            ) : null}
            <AlertDialogAction
              type="button"
              className={cn(LEAD_FORM_PRIMARY_BTN, 'h-11 px-5')}
              disabled={convertPending || !duplicateClient}
              onClick={(event) => {
                event.preventDefault();
                void linkToExistingClient();
              }}
            >
              {convertPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Link lead to existing client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Fragment>
  );
}

/** @deprecated Use LeadDetailsDialog */
export const LeadDetailSheet = LeadDetailsDialog;
