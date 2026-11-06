import { Inject, Injectable } from '@nestjs/common';
import { CRM_REPOSITORY } from '../../../../../domain/repositories/crm.repository.js';
import type { CrmPersistenceHost } from '../../../../../infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import type { LeadRepository } from '../../../../domain/repositories/lead.repository.js';
import { LeadPrismaStore } from '../lead-prisma.store.js';

@Injectable()
export class PrismaLeadRepository implements LeadRepository {
  private readonly store: LeadPrismaStore;

  constructor(@Inject(CRM_REPOSITORY) host: CrmPersistenceHost) {
    this.store = new LeadPrismaStore(host);
  }

  listLeads(...args: Parameters<LeadPrismaStore['listLeads']>) {
    return this.store.listLeads(...args);
  }

  getLead(...args: Parameters<LeadPrismaStore['getLead']>) {
    return this.store.getLead(...args);
  }

  findLeadIdByPhone(...args: Parameters<LeadPrismaStore['findLeadIdByPhone']>) {
    return this.store.findLeadIdByPhone(...args);
  }

  findLeadIdByEmail(...args: Parameters<LeadPrismaStore['findLeadIdByEmail']>) {
    return this.store.findLeadIdByEmail(...args);
  }

  createLead(...args: Parameters<LeadPrismaStore['createLead']>) {
    return this.store.createLead(...args);
  }

  updateLead(...args: Parameters<LeadPrismaStore['updateLead']>) {
    return this.store.updateLead(...args);
  }

  deleteLead(...args: Parameters<LeadPrismaStore['deleteLead']>) {
    return this.store.deleteLead(...args);
  }

  changeLeadStage(...args: Parameters<LeadPrismaStore['changeLeadStage']>) {
    return this.store.changeLeadStage(...args);
  }

  listLeadActivities(...args: Parameters<LeadPrismaStore['listLeadActivities']>) {
    return this.store.listLeadActivities(...args);
  }

  createLeadActivity(...args: Parameters<LeadPrismaStore['createLeadActivity']>) {
    return this.store.createLeadActivity(...args);
  }

  convertLeadToClient(...args: Parameters<LeadPrismaStore['convertLeadToClient']>) {
    return this.store.convertLeadToClient(...args);
  }

  loadTagsByLeadIds(...args: Parameters<LeadPrismaStore['loadTagsByLeadIds']>) {
    return this.store.loadTagsByLeadIds(...args);
  }

  listLeadTags(...args: Parameters<LeadPrismaStore['listLeadTags']>) {
    return this.store.listLeadTags(...args);
  }

  createLeadTag(...args: Parameters<LeadPrismaStore['createLeadTag']>) {
    return this.store.createLeadTag(...args);
  }

  resolveTagIdsByNames(...args: Parameters<LeadPrismaStore['resolveTagIdsByNames']>) {
    return this.store.resolveTagIdsByNames(...args);
  }

  previewLeadImport(...args: Parameters<LeadPrismaStore['previewLeadImport']>) {
    return this.store.previewLeadImport(...args);
  }

  executeLeadImport(...args: Parameters<LeadPrismaStore['executeLeadImport']>) {
    return this.store.executeLeadImport(...args);
  }
}
