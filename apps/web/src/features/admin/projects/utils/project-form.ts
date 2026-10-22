import { toDateInputValue } from '@/features/admin/crm/utils/format';
import { suggestPhaseEndDate } from '@techwin/validation';
import { recalculateAutoSuggestedPhaseDates, type ProjectPhaseFormRow } from './project-phase-schedule';
import type { ProjectDetail, ProjectPhase } from '../types';

export type { ProjectPhaseFormRow } from './project-phase-schedule';

export type ProjectFormState = {
  projectNumber: string;
  name: string;
  priority: ProjectDetail['priority'];
  projectManagerAdminId: string;
  startDate: string;
  expectedEndDate: string;
  description: string;
  clientId: string;
  clientName: string;
  companyName: string;
  clientPhone: string;
  clientEmail: string;
  proposalId: string;
  quotationNumber: string;
  quotationTitle: string;
  acceptedCommercialValue: string;
  scopeAndRequirements: string;
  phases: ProjectPhaseFormRow[];
};

export const newPhaseRow = (partial?: Partial<ProjectPhaseFormRow>): ProjectPhaseFormRow => ({
  key: partial?.key ?? `phase-${crypto.randomUUID()}`,
  id: partial?.id ?? null,
  persisted: partial?.persisted ?? false,
  name: partial?.name ?? '',
  description: partial?.description ?? '',
  startDate: partial?.startDate ?? '',
  expectedEndDate: partial?.expectedEndDate ?? '',
  status: partial?.status ?? 'NOT_STARTED',
  startDateAuto: partial?.startDateAuto ?? false,
  expectedEndDateAuto: partial?.expectedEndDateAuto ?? false,
});

export const emptyProjectForm = (): ProjectFormState => ({
  projectNumber: '',
  name: '',
  priority: 'MEDIUM',
  projectManagerAdminId: '',
  startDate: '',
  expectedEndDate: '',
  description: '',
  clientId: '',
  clientName: '',
  companyName: '',
  clientPhone: '',
  clientEmail: '',
  proposalId: '',
  quotationNumber: '',
  quotationTitle: '',
  acceptedCommercialValue: '',
  scopeAndRequirements: '',
  phases: [],
});

function phaseToRow(phase: ProjectPhase): ProjectPhaseFormRow {
  return newPhaseRow({
    key: phase.id,
    id: phase.id,
    persisted: true,
    name: phase.name,
    description: phase.description,
    startDate: toDateInputValue(phase.startDate),
    expectedEndDate: toDateInputValue(phase.expectedEndDate),
    status: phase.status,
    startDateAuto: false,
    expectedEndDateAuto: false,
  });
}

export function projectToForm(project: ProjectDetail): ProjectFormState {
  return {
    projectNumber: project.projectNumber,
    name: project.name,
    priority: project.priority,
    projectManagerAdminId: project.projectManagerAdminId ?? '',
    startDate: toDateInputValue(project.startDate),
    expectedEndDate: toDateInputValue(project.expectedEndDate),
    description: project.description,
    clientId: project.clientId,
    clientName: project.clientName,
    companyName: project.companyName,
    clientPhone: project.clientPhone,
    clientEmail: project.clientEmail,
    proposalId: project.proposalId ?? '',
    quotationNumber: project.quotationNumber,
    quotationTitle: project.quotationTitle,
    acceptedCommercialValue: project.acceptedCommercialValue ?? '',
    scopeAndRequirements: project.scopeAndRequirements,
    phases: [...project.phases].sort((a, b) => a.sortOrder - b.sortOrder).map(phaseToRow),
  };
}

function phaseRowToPayload(row: ProjectPhaseFormRow) {
  return {
    ...(row.id ? { id: row.id } : {}),
    name: row.name.trim(),
    description: row.description.trim() || undefined,
    startDate: toDateInputValue(row.startDate),
    expectedEndDate: toDateInputValue(row.expectedEndDate),
    ...(row.persisted ? { status: row.status } : {}),
  };
}

export function formToCreatePayload(form: ProjectFormState) {
  return {
    name: form.name.trim(),
    priority: form.priority,
    projectManagerAdminId: form.projectManagerAdminId.trim() ? form.projectManagerAdminId : null,
    startDate: toDateInputValue(form.startDate),
    expectedEndDate: toDateInputValue(form.expectedEndDate),
    description: form.description.trim() || undefined,
    clientId: form.clientId,
    proposalId: form.proposalId.trim() ? form.proposalId : null,
    acceptedCommercialValue: form.acceptedCommercialValue.trim() || undefined,
    scopeAndRequirements: form.scopeAndRequirements.trim() || undefined,
    phases: form.phases.map(phaseRowToPayload),
  };
}

export function formToUpdatePayload(form: ProjectFormState) {
  return formToCreatePayload(form);
}

export function projectScheduleContext(form: Pick<ProjectFormState, 'startDate' | 'expectedEndDate'>) {
  return {
    projectStartDate: toDateInputValue(form.startDate),
    projectExpectedEndDate: toDateInputValue(form.expectedEndDate),
  };
}

export function addProjectPhase(
  phases: readonly ProjectPhaseFormRow[],
  projectStartDate: string,
  projectExpectedEndDate: string,
): ProjectPhaseFormRow[] {
  const projectStart = toDateInputValue(projectStartDate);
  const projectEnd = toDateInputValue(projectExpectedEndDate);
  const row = newPhaseRow({ startDateAuto: true, expectedEndDateAuto: true });
  const next = [...phases, row];
  return recalculateAutoSuggestedPhaseDates(next, phases.length, projectStart, projectEnd);
}

export function patchProjectPhaseRow(
  phases: readonly ProjectPhaseFormRow[],
  key: string,
  patch: Partial<ProjectPhaseFormRow>,
  manualDateField: 'startDate' | 'expectedEndDate' | null,
  projectStartDate: string,
  projectExpectedEndDate: string,
): ProjectPhaseFormRow[] {
  const projectStart = toDateInputValue(projectStartDate);
  const projectEnd = toDateInputValue(projectExpectedEndDate);
  const index = phases.findIndex((row) => row.key === key);
  if (index < 0) return [...phases];

  let updated = phases.map((row) => {
    if (row.key !== key) return row;
    const next = { ...row, ...patch };
    if (manualDateField === 'startDate') {
      next.startDateAuto = false;
    }
    if (manualDateField === 'expectedEndDate') {
      next.expectedEndDateAuto = false;
    }
    return next;
  });

  const row = updated[index]!;
  if (manualDateField === 'startDate' && row.expectedEndDateAuto) {
    const start = toDateInputValue(row.startDate);
    const suggestedEnd = suggestPhaseEndDate(start, projectEnd);
    updated = updated.map((item, itemIndex) =>
      itemIndex === index ? { ...item, expectedEndDate: suggestedEnd } : item,
    );
  }

  return recalculateAutoSuggestedPhaseDates(updated, index + 1, projectStart, projectEnd);
}

export function reorderProjectPhases(
  phases: ProjectPhaseFormRow[],
  projectStartDate: string,
  projectExpectedEndDate: string,
): ProjectPhaseFormRow[] {
  return recalculateAutoSuggestedPhaseDates(
    phases,
    0,
    toDateInputValue(projectStartDate),
    toDateInputValue(projectExpectedEndDate),
  );
}

export function applyProjectTimelineChange(
  phases: readonly ProjectPhaseFormRow[],
  projectStartDate: string,
  projectExpectedEndDate: string,
): ProjectPhaseFormRow[] {
  return recalculateAutoSuggestedPhaseDates(
    phases,
    0,
    toDateInputValue(projectStartDate),
    toDateInputValue(projectExpectedEndDate),
  );
}

export function replaceProjectPhases(
  phases: readonly ProjectPhaseFormRow[],
  projectStartDate: string,
  projectExpectedEndDate: string,
): ProjectPhaseFormRow[] {
  return recalculateAutoSuggestedPhaseDates(
    phases,
    0,
    toDateInputValue(projectStartDate),
    toDateInputValue(projectExpectedEndDate),
  );
}
