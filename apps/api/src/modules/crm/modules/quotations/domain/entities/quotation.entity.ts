import type { QuotationStatus } from '../enums/quotation-status.enum.js';
import { QuotationDeletionPolicy } from '../policies/quotation-deletion.policy.js';
import { QuotationStatusPolicy } from '../policies/quotation-status.policy.js';
import { QuotationUpdatePolicy } from '../policies/quotation-update.policy.js';
import type { QuotationReadModel } from '../types/quotation-read-model.js';

export class Quotation {
  private constructor(private readonly props: QuotationReadModel) {}

  static reconstitute(model: QuotationReadModel): Quotation {
    return new Quotation(model);
  }

  get id(): string {
    return this.props.id;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get status(): QuotationStatus {
    return this.props.status;
  }

  get documentNumber(): string {
    return this.props.documentNumber;
  }

  get leadId(): string | null {
    return this.props.leadId;
  }

  get subtotal(): string {
    return this.props.subtotal;
  }

  get discountTotal(): string {
    return this.props.discountTotal;
  }

  get taxTotal(): string {
    return this.props.taxTotal;
  }

  get grandTotal(): string {
    return this.props.grandTotal;
  }

  assertCanUpdate(): void {
    QuotationUpdatePolicy.assertEditable(this.props.status);
  }

  assertCanDelete(): void {
    QuotationDeletionPolicy.assertCanDelete(this.props.status);
  }

  assertManualStatusTransition(toStatus: QuotationStatus): void {
    QuotationStatusPolicy.assertManualTransition(this.props.status, toStatus);
  }

  assertSendTransition(toStatus: QuotationStatus): void {
    QuotationStatusPolicy.assertSendTransition(this.props.status, toStatus);
  }

  assertAutomatedExpiration(toStatus: QuotationStatus): void {
    QuotationStatusPolicy.assertAutomatedExpiration(this.props.status, toStatus);
  }

  /** @deprecated Use assertManualStatusTransition */
  assertStatusTransition(toStatus: QuotationStatus): void {
    this.assertManualStatusTransition(toStatus);
  }

  toReadModel(): QuotationReadModel {
    return this.props;
  }
}
