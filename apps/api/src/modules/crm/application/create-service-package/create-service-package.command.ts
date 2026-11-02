import type { CrmActor } from '../shared/crm-actor.js';
import type { CreateServicePackageInput } from '../../domain/repositories/crm.repository.js';

export type CreateServicePackageCommand = {
  readonly actor: CrmActor;
  readonly input: CreateServicePackageInput;
};
