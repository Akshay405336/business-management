import type { LeadPriority } from '../enums/lead-priority.enum.js';
import type { LeadSource } from '../enums/lead-source.enum.js';
import type { LeadReadModel } from '../types/lead-read-model.js';
import type { CreateLeadData, UpdateLeadData } from '../types/lead.types.js';
import { LeadEmail } from '../value-objects/lead-email.vo.js';
import { LeadFullName } from '../value-objects/lead-full-name.vo.js';
import { LeadPhone } from '../value-objects/lead-phone.vo.js';

export type LeadProps = {
  readonly id: string;
  readonly organizationId: string;
  readonly referenceNumber: string;
  readonly fullName: string;
  readonly companyName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly website: string | null;
  readonly source: LeadSource;
  readonly pipelineId: string;
  readonly stageId: string;
  readonly assignedAdminId: string | null;
  readonly priority: LeadPriority;
  readonly estimatedValue: string;
  readonly currency: string;
  readonly expectedCloseDate: Date | null;
  readonly nextFollowUpDate: Date | null;
  readonly description: string;
  readonly tags: readonly string[];
  readonly createdByAdminId: string;
  readonly convertedClientId: string | null;
  readonly convertedAt: Date | null;
  readonly convertedByAdminId: string | null;
  readonly archivedAt: Date | null;
  readonly kanbanSortOrder: number;
  readonly lastActivityAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class Lead {
  private constructor(private readonly props: LeadProps) {}

  static reconstitute(props: LeadProps): Lead {
    return new Lead(props);
  }

  static validateCreate(input: CreateLeadData): CreateLeadData {
    LeadFullName.create(input.fullName);
    LeadPhone.required(input.phone ?? '');
    LeadEmail.optional(input.email);
    return input;
  }

  static validateUpdate(input: UpdateLeadData): UpdateLeadData {
    if (input.fullName !== undefined) {
      LeadFullName.create(input.fullName);
    }
    if (input.phone !== undefined) {
      LeadPhone.required(input.phone ?? '');
    }
    if (input.email !== undefined) {
      LeadEmail.optional(input.email);
    }
    return input;
  }

  get id(): string {
    return this.props.id;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get pipelineId(): string {
    return this.props.pipelineId;
  }

  get stageId(): string {
    return this.props.stageId;
  }

  get convertedClientId(): string | null {
    return this.props.convertedClientId;
  }

  get isConverted(): boolean {
    return this.props.convertedClientId !== null;
  }

  get isArchived(): boolean {
    return this.props.archivedAt !== null;
  }

  toReadModel(): LeadReadModel {
    return { ...this.props, tags: [...this.props.tags], leadTags: [] };
  }
}
