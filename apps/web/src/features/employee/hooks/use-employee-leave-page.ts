'use client';

import type {
  EmployeeLeaveBalanceAvailability,
  EmployeeLeaveBalanceItem,
  LeaveRequestItem,
  LeaveTypeItem,
} from '@techwin/contracts';
import type { ApplyLeaveRequest } from '@techwin/validation';
import type { ZodError } from 'zod';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminToast } from '@/features/admin/components/toast';
import { uploadStoredObject } from '@/features/admin/media/api/media';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import {
  applyForLeave,
  cancelLeaveRequest,
  fetchMyLeaveBalances,
  listLeaveTypes,
  listMyLeaveRequests,
  previewLeaveDays,
} from '@/features/leave/api/leave-api';
import { notifyLeaveDataChanged, subscribeLeaveDataChanged } from '@/features/leave/lib/leave-data-sync';
import { isAbortError } from '@/shared/lib/abort-error';
import { isApiError } from '@/shared/api/api-error';
import {
  buildApplyLeavePayload,
  mapLeaveApplyApiDetails,
  mapLeaveApplyZodErrors,
} from '../constants/leave-apply-payload';
import {
  firstSelectableLeaveTypeId,
  hasLeaveBalanceAvailable,
  parseLeaveDayAmount,
} from '../constants/employee-leave-ui';
import { expandInclusiveCalendarRange } from '../constants/leave-calendar-date';

export type EmployeeLeaveHistoryTab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const DEFAULT_PAGE_SIZE = 10;

export function useEmployeeLeavePage() {
  const toast = useAdminToast();
  const calendarYear = new Date().getFullYear();

  const [balances, setBalances] = useState<readonly EmployeeLeaveBalanceItem[]>([]);
  const [balancesAvailability, setBalancesAvailability] =
    useState<EmployeeLeaveBalanceAvailability | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [balancesError, setBalancesError] = useState<string | null>(null);

  const [historyTab, setHistoryTab] = useState<EmployeeLeaveHistoryTab>('PENDING');
  const [history, setHistory] = useState<readonly LeaveRequestItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [leaveDateRange, setLeaveDateRange] = useState<{ startDate: string; endDate: string } | null>(
    null,
  );
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayDate, setHalfDayDate] = useState('');
  const [halfDaySession, setHalfDaySession] = useState<'FIRST_HALF' | 'SECOND_HALF' | ''>('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [previewDays, setPreviewDays] = useState<string | null>(null);
  const [previewHasWorkingDays, setPreviewHasWorkingDays] = useState(true);
  const [policyYearStartDate, setPolicyYearStartDate] = useState<string | null>(null);
  const [policyYearEndDate, setPolicyYearEndDate] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyPending, setApplyPending] = useState(false);
  const [applyFieldErrors, setApplyFieldErrors] = useState<Record<string, string>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [leaveTypeMeta, setLeaveTypeMeta] = useState<Map<string, LeaveTypeItem>>(() => new Map());
  const [cancelPendingId, setCancelPendingId] = useState<string | null>(null);

  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBalances = useCallback(async (signal?: AbortSignal) => {
    setBalancesLoading(true);
    try {
      const result = await fetchMyLeaveBalances({ calendarYear, page: 1, pageSize: 100 }, signal);
      setBalances(result.items);
      setBalancesAvailability(result.availability ?? null);
      setBalancesError(null);
    } catch (failure) {
      if (isAbortError(failure)) return;
      setBalancesError(describeCrmError(failure));
    } finally {
      setBalancesLoading(false);
    }
  }, [calendarYear]);

  const loadHistory = useCallback(
    async (signal?: AbortSignal) => {
      setHistoryLoading(true);
      try {
        const result = await listMyLeaveRequests(
          {
            page: historyPage,
            pageSize: historyPageSize,
            calendarYear,
            status: historyTab === 'ALL' ? undefined : historyTab,
          },
          signal,
        );
        setHistory(result.items);
        setHistoryTotal(result.total);
        setHistoryError(null);
      } catch (failure) {
        if (isAbortError(failure)) return;
        setHistoryError(describeCrmError(failure));
      } finally {
        setHistoryLoading(false);
      }
    },
    [calendarYear, historyPage, historyPageSize, historyTab],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadBalances(controller.signal);
    return () => controller.abort();
  }, [loadBalances]);

  useEffect(() => {
    let cancelled = false;
    void listLeaveTypes({ page: 1, status: 'ACTIVE', pageSize: 100 })
      .then((result) => {
        if (cancelled) return;
        setLeaveTypeMeta(new Map(result.items.map((item) => [item.id, item])));
      })
      .catch(() => {
        if (!cancelled) setLeaveTypeMeta(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadHistory(controller.signal);
    return () => controller.abort();
  }, [loadHistory]);

  useEffect(() => {
    return subscribeLeaveDataChanged(() => {
      void loadBalances();
      void loadHistory();
    });
  }, [loadBalances, loadHistory]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyTab]);

  const activeBalances = useMemo(
    () =>
      balances.filter((balance) => {
        const meta = leaveTypeMeta.get(balance.leaveTypeId);
        return meta ? meta.status === 'ACTIVE' : true;
      }),
    [balances, leaveTypeMeta],
  );

  const selectedBalance = useMemo(
    () => activeBalances.find((b) => b.leaveTypeId === leaveTypeId) ?? null,
    [activeBalances, leaveTypeId],
  );

  const selectedLeaveDates = useMemo(
    () =>
      leaveDateRange
        ? expandInclusiveCalendarRange(leaveDateRange.startDate, leaveDateRange.endDate)
        : [],
    [leaveDateRange],
  );

  const setSelectedLeaveDates = useCallback((dates: readonly string[]) => {
    const sorted = [...dates].filter(Boolean).sort();
    if (sorted.length === 0) {
      setLeaveDateRange(null);
      return;
    }
    setLeaveDateRange({
      startDate: sorted[0]!,
      endDate: sorted[sorted.length - 1]!,
    });
  }, []);

  const balanceShortageMessage = useMemo(() => {
    if (!selectedBalance || previewDays === null) return null;
    const available = parseLeaveDayAmount(selectedBalance.availableDays);
    const requested = parseLeaveDayAmount(previewDays);
    if (requested <= available) return null;
    return `${previewDays} working day(s) requested. Available balance: ${selectedBalance.availableDays} days.`;
  }, [selectedBalance, previewDays]);

  useEffect(() => {
    if (leaveTypeId) return;
    const next = firstSelectableLeaveTypeId(activeBalances);
    if (next) setLeaveTypeId(next);
  }, [leaveTypeId, activeBalances]);

  useEffect(() => {
    if (!isHalfDay) {
      setHalfDayDate('');
      return;
    }
    if (selectedLeaveDates.length === 1) {
      setHalfDayDate(selectedLeaveDates[0]!);
      return;
    }
    if (halfDayDate && !selectedLeaveDates.includes(halfDayDate)) {
      setHalfDayDate('');
    }
  }, [isHalfDay, selectedLeaveDates, halfDayDate]);

  useEffect(() => {
    if (!leaveDateRange) {
      setPreviewDays(null);
      setPreviewHasWorkingDays(true);
      return;
    }
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      void (async () => {
        setPreviewLoading(true);
        try {
          const result = await previewLeaveDays({
            startDate: leaveDateRange.startDate,
            endDate: leaveDateRange.endDate,
            isHalfDay,
            halfDayDate: isHalfDay && halfDayDate ? halfDayDate : undefined,
            leaveTypeId: leaveTypeId || undefined,
          });
          setPreviewDays(result.totalDays);
          setPreviewHasWorkingDays(result.hasWorkingLeaveDays);
          setPolicyYearStartDate(result.policyYearStartDate);
          setPolicyYearEndDate(result.policyYearEndDate);
        } catch {
          setPreviewDays(null);
          setPreviewHasWorkingDays(true);
        } finally {
          setPreviewLoading(false);
        }
      })();
    }, 400);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [leaveDateRange, isHalfDay, halfDayDate, leaveTypeId]);

  useEffect(() => {
    void previewLeaveDays({
      startDate: '2000-01-01',
      endDate: '2000-01-01',
      isHalfDay: false,
      skipDuration: true,
    })
      .then((result) => {
        setPolicyYearStartDate(result.policyYearStartDate);
        setPolicyYearEndDate(result.policyYearEndDate);
      })
      .catch(() => {
        setPolicyYearStartDate(null);
        setPolicyYearEndDate(null);
      });
  }, []);

  const resetApplyForm = useCallback(() => {
    setLeaveDateRange(null);
    setIsHalfDay(false);
    setHalfDayDate('');
    setHalfDaySession('');
    setReason('');
    setNotes('');
    setPreviewDays(null);
    setAttachmentFile(null);
    setApplyFieldErrors({});
    const next = firstSelectableLeaveTypeId(activeBalances);
    setLeaveTypeId(next ?? '');
  }, [activeBalances]);

  const applyLeave = async (): Promise<boolean> => {
    setApplyFieldErrors({});
    const errors: Record<string, string> = {};
    if (!leaveTypeId) {
      errors.leaveTypeId = 'Select a leave type.';
    }
    if (selectedLeaveDates.length === 0) {
      errors.selectedDates = 'Select at least one leave date.';
    }
    if (!leaveTypeId || selectedLeaveDates.length === 0) {
      setApplyFieldErrors(errors);
      toast.error('Fill in leave type and leave dates.');
      return false;
    }
    if (isHalfDay && selectedLeaveDates.length > 1 && !halfDayDate) {
      errors.halfDayDate = 'Select which date is the half-day.';
    }
    if (!reason.trim()) {
      errors.reason = 'Reason is required.';
    }
    if (isHalfDay && !halfDaySession) {
      toast.error('Select a half-day session.');
      return false;
    }
    const balanceRow = activeBalances.find((b) => b.leaveTypeId === leaveTypeId);
    if (!balanceRow) {
      toast.error('Select a leave type with an available balance.');
      return false;
    }
    if (!hasLeaveBalanceAvailable(balanceRow)) {
      toast.error('No balance available for this leave type.');
      return false;
    }
    if (previewDays !== null && !previewHasWorkingDays) {
      errors.selectedDates =
        'The selected dates include no eligible working leave days according to the organization calendar.';
    }
    if (previewDays !== null && previewHasWorkingDays) {
      const available = parseLeaveDayAmount(balanceRow.availableDays);
      const requested = parseLeaveDayAmount(previewDays);
      if (requested > available) {
        errors.balance = `Insufficient balance. Available: ${balanceRow.availableDays} day(s), requested: ${previewDays}.`;
      }
    }
    if (Object.keys(errors).length > 0) {
      setApplyFieldErrors(errors);
      return false;
    }

    setApplyPending(true);
    try {
      let attachmentStoredObjectId: string | null | undefined;
      if (attachmentFile) {
        if (!attachmentFile.type.startsWith('image/')) {
          toast.error('Upload a JPEG, PNG, or WebP image for the supporting document.');
          return false;
        }
        const uploaded = await uploadStoredObject(attachmentFile, 'EMPLOYEE_PROFILE_IMAGE');
        attachmentStoredObjectId = uploaded.id;
      }
      let payload: ApplyLeaveRequest;
      try {
        payload = buildApplyLeavePayload({
          leaveTypeId,
          selectedLeaveDates,
          isHalfDay,
          halfDayDate,
          halfDaySession,
          reason,
          notes,
          attachmentStoredObjectId: attachmentStoredObjectId ?? null,
        });
      } catch (validationError) {
        if (validationError && typeof validationError === 'object' && 'issues' in validationError) {
          setApplyFieldErrors(mapLeaveApplyZodErrors(validationError as ZodError));
          toast.error('Fix the highlighted fields before submitting.');
          return false;
        }
        throw validationError;
      }
      await applyForLeave(payload);
      toast.success('Leave application submitted.');
      resetApplyForm();
      setHistoryTab('PENDING');
      setHistoryPage(1);
      await Promise.all([loadBalances(), loadHistory()]);
      notifyLeaveDataChanged();
      return true;
    } catch (failure) {
      if (isApiError(failure) && failure.details.length > 0) {
        setApplyFieldErrors((previous) => ({
          ...previous,
          ...mapLeaveApplyApiDetails(failure.details),
        }));
        toast.error('Could not submit your leave application. Please review the highlighted fields.');
        return false;
      }
      toast.error(describeCrmError(failure));
      return false;
    } finally {
      setApplyPending(false);
    }
  };

  const cancelRequest = async (id: string) => {
    setCancelPendingId(id);
    try {
      await cancelLeaveRequest(id);
      toast.success('Leave request cancelled.');
      await Promise.all([loadBalances(), loadHistory()]);
    } catch (failure) {
      toast.error(describeCrmError(failure));
    } finally {
      setCancelPendingId(null);
    }
  };

  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / historyPageSize));

  return {
    calendarYear,
    balances: activeBalances,
    balancesAvailability,
    balancesLoading,
    balancesError,
    selectedBalance,
    balanceShortageMessage,
    leaveTypeId,
    setLeaveTypeId,
    selectedLeaveDates,
    setSelectedLeaveDates,
    isHalfDay,
    setIsHalfDay,
    halfDayDate,
    setHalfDayDate,
    halfDaySession,
    setHalfDaySession,
    reason,
    setReason,
    notes,
    setNotes,
    previewDays,
    previewHasWorkingDays,
    leaveDateRange,
    policyYearStartDate,
    policyYearEndDate,
    previewLoading,
    leaveTypeMeta,
    applyPending,
    applyFieldErrors,
    attachmentFile,
    setAttachmentFile,
    resetApplyForm,
    applyLeave,
    historyTab,
    setHistoryTab,
    history,
    historyLoading,
    historyError,
    historyPage,
    setHistoryPage,
    historyPageSize,
    setHistoryPageSize,
    historyTotal,
    historyTotalPages,
    cancelPendingId,
    cancelRequest,
    reloadHistory: loadHistory,
    reloadBalances: loadBalances,
  };
}
