/**
 * Catalog packages may be deleted when referenced by proposals: line items keep copied
 * fields; `sourcePackageId` is cleared and proposal documents use `onDelete: SetNull`.
 */
export class ServicePackageDeletionPolicy {
  static assertCanDelete(_proposalReferenceCount: number): void {
    // Deletion is allowed; references are detached at persistence layer.
  }
}
