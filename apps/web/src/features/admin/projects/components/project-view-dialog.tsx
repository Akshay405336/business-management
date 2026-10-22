'use client';

import { FolderKanban, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ProjectDetail } from '../types';
import { formatDateOnly, formatMoney } from '@/features/admin/crm/utils/format';
import { labelProjectPhase, labelProjectPhaseStatus } from '@/features/admin/projects/utils/labels';
import { ProjectPriorityBadge } from './project-priority-badge';
import { ProjectProgressBar } from './project-progress-bar';
import { ProjectStatusBadge } from './project-status-badge';

export function ProjectViewDialog({
  open,
  project,
  loading,
  onOpenChange,
  onEdit,
}: {
  open: boolean;
  project: ProjectDetail | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-3">
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="size-4" aria-hidden="true" />
            {project ? project.projectNumber : 'Project details'}
          </DialogTitle>
          <DialogDescription>
            {project ? project.name : 'Loading project…'}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading || !project ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading project…
            </div>
          ) : (
            <div className="grid gap-6">
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Project details</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">Status</dt>
                    <dd>
                      <ProjectStatusBadge status={project.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Priority</dt>
                    <dd>
                      <ProjectPriorityBadge priority={project.priority} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Current phase</dt>
                    <dd>{labelProjectPhase(project.currentPhase)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Project manager</dt>
                    <dd>{project.projectManagerName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Start date</dt>
                    <dd>{formatDateOnly(project.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Expected end</dt>
                    <dd>{formatDateOnly(project.expectedEndDate)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground text-xs">Progress</dt>
                    <dd className="max-w-xs pt-1">
                      <ProjectProgressBar percent={project.progressPercent} />
                    </dd>
                  </div>
                  {project.description ? (
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground text-xs">Description</dt>
                      <dd className="whitespace-pre-wrap">{project.description}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Client</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">Client name</dt>
                    <dd>{project.clientName}</dd>
                  </div>
                  {project.companyName ? (
                    <div>
                      <dt className="text-muted-foreground text-xs">Company / contact</dt>
                      <dd>{project.companyName}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-muted-foreground text-xs">Phone</dt>
                    <dd>{project.clientPhone || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Email</dt>
                    <dd>{project.clientEmail || '—'}</dd>
                  </div>
                </dl>
              </section>

              {project.quotationNumber ? (
                <section className="grid gap-2">
                  <h3 className="text-sm font-semibold">Quotation</h3>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground text-xs">Quotation number</dt>
                      <dd>{project.quotationNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">Title</dt>
                      <dd>{project.quotationTitle}</dd>
                    </div>
                    {project.acceptedCommercialValue ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Commercial value</dt>
                        <dd>{formatMoney(project.acceptedCommercialValue, project.currency)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>
              ) : null}

              {(project.scopeAndRequirements ||
                project.mainDeliverables ||
                project.acceptanceCriteria) && (
                <section className="grid gap-2">
                  <h3 className="text-sm font-semibold">Scope</h3>
                  {project.scopeAndRequirements ? (
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs">Requirements</p>
                      <p className="whitespace-pre-wrap">{project.scopeAndRequirements}</p>
                    </div>
                  ) : null}
                  {project.mainDeliverables ? (
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs">Deliverables</p>
                      <p className="whitespace-pre-wrap">{project.mainDeliverables}</p>
                    </div>
                  ) : null}
                  {project.acceptanceCriteria ? (
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs">Acceptance criteria</p>
                      <p className="whitespace-pre-wrap">{project.acceptanceCriteria}</p>
                    </div>
                  ) : null}
                </section>
              )}

              {project.phases.length > 0 ? (
                <section className="grid gap-2">
                  <h3 className="text-sm font-semibold">Project phases</h3>
                  <ol className="grid gap-2">
                    {[...project.phases]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((phase) => (
                        <li
                          key={phase.id}
                          className="rounded-lg border px-3 py-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">{phase.name}</span>
                            <span className="text-muted-foreground text-xs">
                              {labelProjectPhaseStatus(phase.status)}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatDateOnly(phase.startDate)} – {formatDateOnly(phase.expectedEndDate)}
                          </p>
                          {phase.description ? (
                            <p className="text-muted-foreground mt-1 whitespace-pre-wrap text-xs">
                              {phase.description}
                            </p>
                          ) : null}
                        </li>
                      ))}
                  </ol>
                </section>
              ) : null}
            </div>
          )}
        </div>
        {project && onEdit ? (
          <DialogFooter className="shrink-0 border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={() => onEdit(project.id)}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit project
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
