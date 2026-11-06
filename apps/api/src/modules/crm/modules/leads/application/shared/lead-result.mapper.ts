import type { Lead } from '../../domain/entities/lead.entity.js';
import type { LeadActivity } from '../../domain/entities/lead-activity.entity.js';
import type {
  LeadActivityReadModel,
  LeadReadModel,
  LeadTagSnapshot,
} from '../../domain/types/lead-read-model.js';

export function toLeadReadModel(lead: Lead): LeadReadModel {
  return lead.toReadModel();
}

export function enrichLeadReadModel(
  lead: LeadReadModel,
  leadTags: readonly LeadTagSnapshot[],
): LeadReadModel {
  return {
    ...lead,
    leadTags: [...leadTags],
    tags: leadTags.length > 0 ? leadTags.map((tag) => tag.name) : [...lead.tags],
  };
}

export function toLeadActivityReadModel(activity: LeadActivity): LeadActivityReadModel {
  return activity.toReadModel();
}
