import { Inject, Injectable } from '@nestjs/common';
import {
  WHATSAPP_INBOX_STORE,
  type WhatsAppInboxStore,
} from '../repositories/whatsapp-stores.js';

/** Resolves the employee row linked to an admin for WhatsApp inbox scoping. */
@Injectable()
export class WhatsAppEmployeeIdResolver {
  constructor(@Inject(WHATSAPP_INBOX_STORE) private readonly inbox: WhatsAppInboxStore) {}

  resolveEmployeeId(organizationId: string, adminId: string): Promise<string | null> {
    return this.inbox.resolveEmployeeId(organizationId, adminId);
  }
}
