const SAMPLE_ROWS = [
  [
    'Full Name',
    'Phone',
    'Email',
    'Stage',
    'Priority',
    'Source',
    'Tags',
    'Value',
    'Notes',
  ],
  [
    'Vijay Kumar',
    '9876756453',
    'vijay@gmail.com',
    'New Lead',
    'LOW',
    'WEBSITE',
    'Urgent',
    '50000',
    'Interested in website',
  ],
  [
    'Ramya S',
    '9876543212',
    '',
    'First Call',
    'MEDIUM',
    'REFERRAL',
    'Risk',
    '25000',
    'Follow up required',
  ],
];

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildLeadImportSampleCsv(): string {
  return SAMPLE_ROWS.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function downloadLeadImportSampleCsv(): void {
  const blob = new Blob([buildLeadImportSampleCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'lead-import-sample.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}
