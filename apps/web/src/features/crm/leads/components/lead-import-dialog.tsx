'use client';

import { Loader2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CrmLeadImportPreviewResponse, CrmLeadImportResponse } from '@techwin/contracts';
import type { LeadImportPayload } from '../api/lead-import.api';
import type { LeadImportFieldKey } from '@techwin/validation';
import { cn } from '@/shared/lib/utils';
import { executeLeadImport, validateLeadImport } from '../api/lead-import.api';
import type { CrmPipeline } from '../types/lead.types';
import { downloadLeadImportSampleCsv } from '../utils/lead-import-sample';
import {
  LEAD_IMPORT_MAX_FILE_BYTES,
  mapSheetToImportRows,
  parseLeadImportFile,
  suggestImportFieldMapping,
  type ParsedImportSheet,
} from '../utils/lead-import-parse';

type Step = 'upload' | 'preview' | 'done';

const FIELD_LABELS: Record<LeadImportFieldKey | 'skip', string> = {
  fullName: 'Full name',
  phone: 'Phone',
  email: 'Email',
  stage: 'Stage',
  priority: 'Priority',
  source: 'Source',
  tags: 'Tags',
  estimatedValue: 'Value',
  description: 'Notes',
  skip: 'Skip',
};

export function LeadImportDialog({
  open,
  onOpenChange,
  pipelines,
  defaultPipelineId,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelines: readonly CrmPipeline[];
  defaultPipelineId?: string;
  onImported: () => void;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [pipelineId, setPipelineId] = useState(defaultPipelineId ?? '');
  const [sheet, setSheet] = useState<ParsedImportSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, LeadImportFieldKey | 'skip'>>({});
  const [preview, setPreview] = useState<CrmLeadImportPreviewResponse | null>(null);
  const [result, setResult] = useState<CrmLeadImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const activePipelines = useMemo(
    () => pipelines.filter((pipeline) => pipeline.status === 'ACTIVE'),
    [pipelines],
  );

  const reset = () => {
    setStep('upload');
    setSheet(null);
    setMapping({});
    setPreview(null);
    setResult(null);
    setError(null);
    setPipelineId(defaultPipelineId ?? activePipelines[0]?.id ?? '');
  };

  const onFile = async (file: File) => {
    setError(null);
    if (file.size > LEAD_IMPORT_MAX_FILE_BYTES) {
      setError('File is too large (max 5 MB).');
      return;
    }
    try {
      const parsed = await parseLeadImportFile(file);
      setSheet(parsed);
      setMapping(suggestImportFieldMapping(parsed.headers));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not read file.');
    }
  };

  const buildPayload = () => {
    if (!sheet || !pipelineId) return null;
    const rows = mapSheetToImportRows(sheet, mapping);
    return { pipelineId, rows } as LeadImportPayload;
  };

  const runPreview = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setPending(true);
    setError(null);
    try {
      const response = await validateLeadImport(payload);
      setPreview(response);
      setStep('preview');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Validation failed.');
    } finally {
      setPending(false);
    }
  };

  const runImport = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setPending(true);
    setError(null);
    try {
      const response = await executeLeadImport(payload);
      setResult(response);
      setStep('done');
      onImported();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Import failed.');
    } finally {
      setPending(false);
    }
  };

  const mappingValid =
    Object.values(mapping).includes('fullName') && Object.values(mapping).includes('phone');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-border/60 border-b px-6 py-4 text-left">
          <DialogTitle>Import leads</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Upload your lead file, match columns, review validation, and import new records into the
            selected pipeline.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {error ? <p className="text-destructive mb-3 text-sm">{error}</p> : null}

          {step === 'upload' ? (
            <div className="grid gap-4">
              <div>
                <p className="mb-1.5 text-sm font-medium">Pipeline</p>
                <Select value={pipelineId || undefined} onValueChange={setPipelineId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {activePipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={downloadLeadImportSampleCsv}>
                  Download sample CSV
                </Button>
              </div>
              <label
                className={cn(
                  'border-border flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center',
                  !pipelineId && 'pointer-events-none opacity-50',
                )}
              >
                <Upload className="text-muted-foreground size-8" aria-hidden="true" />
                <span className="text-sm font-medium">Upload CSV or XLSX</span>
                <span className="text-muted-foreground text-xs">Max 5 MB · up to 500 rows</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  disabled={!pipelineId}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onFile(file);
                    event.target.value = '';
                  }}
                />
              </label>
              {sheet ? (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Column mapping</p>
                  {sheet.headers.map((header) => (
                    <div key={header} className="grid grid-cols-2 items-center gap-2 text-sm">
                      <span className="truncate">{header}</span>
                      <Select
                        value={mapping[header] ?? 'skip'}
                        onValueChange={(value) =>
                          setMapping((current) => ({
                            ...current,
                            [header]: value as LeadImportFieldKey | 'skip',
                          }))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FIELD_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 'preview' && preview ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <span>Total: {preview.totalRows}</span>
                <span>New: {preview.validNewCount}</span>
                <span>Existing: {preview.existingCount}</span>
                <span>Duplicates in file: {preview.duplicateInFileCount}</span>
                <span>Invalid: {preview.invalidCount}</span>
                <span>Ready: {preview.readyToImportCount}</span>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-2">#</th>
                      <th className="px-2 py-2">Name</th>
                      <th className="px-2 py-2">Phone</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.rowNumber} className="border-t">
                        <td className="px-2 py-1.5 tabular-nums">{row.rowNumber}</td>
                        <td className="px-2 py-1.5">{row.fullName || '—'}</td>
                        <td className="px-2 py-1.5 tabular-nums">{row.phone || '—'}</td>
                        <td className="px-2 py-1.5">{row.status}</td>
                        <td className="text-muted-foreground px-2 py-1.5">{row.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {step === 'done' && result ? (
            <div className="grid gap-2 text-sm">
              <p>Imported: {result.importedCount}</p>
              <p>Skipped (existing): {result.existingCount}</p>
              <p>Duplicates in file: {result.duplicateCount}</p>
              <p>Failed: {result.failedCount}</p>
              {result.rowErrors.length > 0 ? (
                <ul className="text-muted-foreground list-disc pl-5 text-xs">
                  {result.rowErrors.map((row) => (
                    <li key={row.rowNumber}>
                      Row {row.rowNumber}: {row.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-border/60 shrink-0 border-t px-6 py-4">
          {step === 'upload' ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!sheet || !pipelineId || !mappingValid || pending}
                onClick={() => void runPreview()}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Preview
              </Button>
            </>
          ) : null}
          {step === 'preview' ? (
            <>
              <Button type="button" variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                type="button"
                disabled={pending || !preview || preview.readyToImportCount === 0}
                onClick={() => void runImport()}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Import {preview?.readyToImportCount ?? 0} leads
              </Button>
            </>
          ) : null}
          {step === 'done' ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
