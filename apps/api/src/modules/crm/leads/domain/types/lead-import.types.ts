export type LeadImportRowInput = {
  readonly rowNumber: number;
  readonly fullName?: string;
  readonly phone?: string;
  readonly email?: string | null;
  readonly stage?: string;
  readonly priority?: string;
  readonly source?: string;
  readonly tags?: readonly string[];
  readonly estimatedValue?: string;
  readonly description?: string;
};
