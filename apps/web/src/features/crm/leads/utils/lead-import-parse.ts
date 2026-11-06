import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { LeadImportFieldKey } from '@techwin/validation';

export const LEAD_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const LEAD_IMPORT_MAX_ROWS = 500;

const HEADER_ALIASES: Record<string, LeadImportFieldKey> = {
  'full name': 'fullName',
  name: 'fullName',
  phone: 'phone',
  mobile: 'phone',
  'mobile number': 'phone',
  email: 'email',
  stage: 'stage',
  'pipeline stage': 'stage',
  priority: 'priority',
  source: 'source',
  tags: 'tags',
  tag: 'tags',
  value: 'estimatedValue',
  'estimated value': 'estimatedValue',
  notes: 'description',
  description: 'description',
};

export type ParsedImportSheet = {
  headers: string[];
  rows: string[][];
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function suggestImportFieldMapping(headers: readonly string[]): Record<string, LeadImportFieldKey | 'skip'> {
  const mapping: Record<string, LeadImportFieldKey | 'skip'> = {};
  for (const header of headers) {
    const key = normalizeHeader(header);
    mapping[header] = HEADER_ALIASES[key] ?? 'skip';
  }
  return mapping;
}

export function parseLeadImportCsv(file: File): Promise<ParsedImportSheet> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (result) => {
        const data = result.data.filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
        if (data.length === 0) {
          reject(new Error('The file is empty.'));
          return;
        }
        const [headerRow, ...body] = data;
        if (!headerRow) {
          reject(new Error('The file is missing a header row.'));
          return;
        }
        resolve({
          headers: headerRow.map((cell) => String(cell ?? '').trim()),
          rows: body.slice(0, LEAD_IMPORT_MAX_ROWS),
        });
      },
      error: (error) => reject(error),
    });
  });
}

export function parseLeadImportXlsx(file: File): Promise<ParsedImportSheet> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('The workbook has no sheets.');
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error('The workbook sheet could not be read.');
    const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as string[][];
    const data = matrix.filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
    if (data.length === 0) throw new Error('The file is empty.');
    const [headerRow, ...body] = data;
    if (!headerRow) throw new Error('The file is missing a header row.');
    return {
      headers: headerRow.map((cell) => String(cell ?? '').trim()),
      rows: body.slice(0, LEAD_IMPORT_MAX_ROWS).map((row) => row.map((cell) => String(cell ?? ''))),
    };
  });
}

export async function parseLeadImportFile(file: File): Promise<ParsedImportSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseLeadImportXlsx(file);
  if (name.endsWith('.csv')) return parseLeadImportCsv(file);
  throw new Error('Unsupported file type. Upload CSV or XLSX.');
}

export function mapSheetToImportRows(
  sheet: ParsedImportSheet,
  mapping: Record<string, LeadImportFieldKey | 'skip'>,
): { rowNumber: number; fullName?: string; phone?: string; email?: string; stage?: string; priority?: string; source?: string; tags?: string[]; estimatedValue?: string; description?: string }[] {
  return sheet.rows.map((cells, index) => {
    const row: Record<string, string | string[] | undefined> = {};
    sheet.headers.forEach((header, colIndex) => {
      const field = mapping[header] ?? 'skip';
      if (field === 'skip') return;
      const raw = String(cells[colIndex] ?? '').trim();
      if (!raw) return;
      if (field === 'tags') {
        row.tags = raw.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
        return;
      }
      row[field] = raw;
    });
    return { rowNumber: index + 2, ...row };
  });
}
