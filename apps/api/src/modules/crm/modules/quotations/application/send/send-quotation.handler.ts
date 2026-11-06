import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TRANSACTIONAL_EMAIL,
  type TransactionalEmailPort,
} from '../../../../../../infrastructure/email/transactional-email.port.js';
import { Quotation } from '../../domain/entities/quotation.entity.js';
import { QuotationNotFoundError, QuotationValidationError } from '../../domain/errors/quotation.errors.js';
import { QuotationSendPolicy } from '../../domain/policies/quotation-send.policy.js';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';
import type { QuotationReadModel } from '../../domain/types/quotation-read-model.js';
import { dedupeRecipientFields } from '../../domain/utils/quotation-email.utils.js';
import { QuotationPdfService } from '../../infrastructure/pdf/quotation-pdf.service.js';
import { quotationAudit } from '../shared/quotation-audit.js';
import { QuotationExpiryReconciliation } from '../shared/quotation-expiry-reconciliation.js';
import type { SendQuotationCommand } from './send-quotation.command.js';

@Injectable()
export class SendQuotationHandler {
  private readonly logger = new Logger(SendQuotationHandler.name);

  constructor(
    @Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository,
    @Inject(TRANSACTIONAL_EMAIL) private readonly email: TransactionalEmailPort,
    @Inject(QuotationPdfService) private readonly pdf: QuotationPdfService,
    @Inject(QuotationExpiryReconciliation)
    private readonly expiryReconciliation: QuotationExpiryReconciliation,
  ) {}

  async execute(command: SendQuotationCommand): Promise<QuotationReadModel> {
    const { actor, quotationId } = command;
    await this.expiryReconciliation.reconcileOrganization(actor.organizationId);

    const existing = await this.quotations.findById(actor.organizationId, quotationId);
    if (!existing) throw new QuotationNotFoundError('Quotation');

    const quotation = Quotation.reconstitute(existing);
    QuotationSendPolicy.assertCanSend({
      status: quotation.status,
      expiryDate: existing.expiryDate,
    });
    quotation.assertSendTransition('SENT');

    const recipients = dedupeRecipientFields({
      to: command.to,
      cc: command.cc,
      bcc: command.bcc,
    });

    const print = await this.quotations.getPrintData(actor.organizationId, quotationId);
    const pdfBytes = await this.pdf.render(print);
    const filename = this.pdf.filename(print.documentNumber);

    const subject = command.subject.trim();
    const bodyText = command.bodyText.trim();
    if (!subject) throw new QuotationValidationError('Email subject is required.');
    if (!bodyText) throw new QuotationValidationError('Email body is required.');

    try {
      await this.email.send({
        to: recipients.to,
        cc: recipients.cc,
        bcc: recipients.bcc,
        subject,
        text: bodyText,
        attachments: [
          {
            filename,
            contentType: 'application/pdf',
            content: pdfBytes,
          },
        ],
      });
    } catch (error) {
      this.logger.warn(
        `Quotation send failed quotationId=${quotationId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      await this.quotations.recordAudit(
        actor.organizationId,
        quotationAudit(actor, 'QUOTATION_SEND_FAILED', quotationId, {
          toCount: recipients.to.length,
        }),
      );
      throw new QuotationValidationError(
        error instanceof Error ? error.message : 'Unable to send quotation email.',
      );
    }

    const sentAt = new Date();
    return this.quotations.changeStatus(
      actor.organizationId,
      quotationId,
      'SENT',
      'Quotation emailed to client.',
      actor.adminId,
      quotationAudit(actor, 'QUOTATION_SENT', quotationId, {
        toCount: recipients.to.length,
        ccCount: recipients.cc.length,
        bccCount: recipients.bcc.length,
      }),
      existing.status,
      { sentAt },
    );
  }
}
