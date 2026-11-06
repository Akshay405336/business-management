import { Module } from '@nestjs/common';
import { SmtpTransactionalEmailService } from './smtp-transactional-email.service.js';
import { TRANSACTIONAL_EMAIL } from './transactional-email.port.js';

@Module({
  providers: [
    SmtpTransactionalEmailService,
    { provide: TRANSACTIONAL_EMAIL, useExisting: SmtpTransactionalEmailService },
  ],
  exports: [TRANSACTIONAL_EMAIL],
})
export class EmailModule {}
