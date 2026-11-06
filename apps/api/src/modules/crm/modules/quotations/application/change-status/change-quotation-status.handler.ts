import { Inject, Injectable } from '@nestjs/common';
import { Quotation } from '../../domain/entities/quotation.entity.js';
import { QuotationStatusChangedEvent } from '../../domain/events/quotation-status-changed.event.js';
import { QuotationNotFoundError } from '../../domain/errors/quotation.errors.js';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';
import type { QuotationReadModel } from '../../domain/types/quotation-read-model.js';
import { quotationAudit } from '../shared/quotation-audit.js';
import type { ChangeQuotationStatusCommand } from './change-quotation-status.command.js';

@Injectable()
export class ChangeQuotationStatusHandler {
  constructor(@Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository) {}

  async execute(command: ChangeQuotationStatusCommand): Promise<QuotationReadModel> {
    const { actor, quotationId, toStatus, note = '' } = command;
    const existing = await this.quotations.findById(actor.organizationId, quotationId);
    if (!existing) throw new QuotationNotFoundError('Quotation');

    const quotation = Quotation.reconstitute(existing);
    if (quotation.status === toStatus) {
      return existing;
    }
    quotation.assertManualStatusTransition(toStatus);
    void new QuotationStatusChangedEvent(
      actor.organizationId,
      quotationId,
      quotation.status,
      toStatus,
    );

    return this.quotations.changeStatus(
      actor.organizationId,
      quotationId,
      toStatus,
      note,
      actor.adminId,
      quotationAudit(actor, 'QUOTATION_STATUS_CHANGED', quotationId, { toStatus }),
      quotation.status,
    );
  }
}
