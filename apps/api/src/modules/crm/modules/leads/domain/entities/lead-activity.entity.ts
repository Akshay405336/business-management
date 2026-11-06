import type { LeadActivityType } from '../enums/lead-activity-type.enum.js';
import type { LeadActivityReadModel } from '../types/lead-read-model.js';

export type LeadActivityProps = {
  readonly id: string;
  readonly organizationId: string;
  readonly leadId: string;
  readonly type: LeadActivityType;
  readonly title: string;
  readonly description: string;
  readonly occurredAt: Date;
  readonly dueAt: Date | null;
  readonly completedAt: Date | null;
  readonly metadata: unknown;
  readonly createdByAdminId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class LeadActivity {
  private constructor(private readonly props: LeadActivityProps) {}

  static reconstitute(props: LeadActivityProps): LeadActivity {
    return new LeadActivity(props);
  }

  toReadModel(): LeadActivityReadModel {
    return { ...this.props };
  }
}
