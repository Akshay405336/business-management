export type LeadBulkActionResult = {
  readonly succeededIds: readonly string[];
  readonly failures: readonly { readonly leadId: string; readonly message: string }[];
};
