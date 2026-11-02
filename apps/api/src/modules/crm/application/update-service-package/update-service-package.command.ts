import type { CrmActor } from '../shared/crm-actor.js';
import type { UpdateServicePackageInput } from '../../domain/repositories/crm.repository.js';

export type UpdateServicePackageCommand = {
  readonly actor: CrmActor;
  readonly packageId: string;
  readonly input: UpdateServicePackageInput;
};
