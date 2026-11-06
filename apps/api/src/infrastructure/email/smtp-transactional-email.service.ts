import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import type {
  OutboundEmailMessage,
  TransactionalEmailPort,
} from './transactional-email.port.js';

@Injectable()
export class SmtpTransactionalEmailService implements TransactionalEmailPort {
  private readonly logger = new Logger(SmtpTransactionalEmailService.name);
  private transporter: Transporter | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async send(message: OutboundEmailMessage): Promise<void> {
    const email = this.config.email;
    if (!email.enabled) {
      throw new Error('Email delivery is disabled.');
    }
    if (email.transport === 'log') {
      this.logger.log(
        {
          to: message.to,
          cc: message.cc ?? [],
          bcc: message.bcc ?? [],
          subject: message.subject,
          attachmentCount: message.attachments?.length ?? 0,
        },
        'Email (log transport)',
      );
      return;
    }
    const transport = this.transporter ?? this.createTransport();
    this.transporter = transport;
    const from = this.config.email.from;
    if (!from) throw new Error('SMTP_FROM is not configured.');
    await transport.sendMail({
      from,
      to: message.to.join(', '),
      cc: message.cc?.length ? message.cc.join(', ') : undefined,
      bcc: message.bcc?.length ? message.bcc.join(', ') : undefined,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments?.map((item) => ({
        filename: item.filename,
        content: item.content,
        contentType: item.contentType,
      })),
    });
  }

  private createTransport(): Transporter {
    const smtp = this.config.email.smtp;
    if (!smtp.host) {
      throw new Error('SMTP is not configured.');
    }
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth:
        smtp.user && smtp.pass
          ? {
              user: smtp.user,
              pass: smtp.pass,
            }
          : undefined,
    });
  }
}
