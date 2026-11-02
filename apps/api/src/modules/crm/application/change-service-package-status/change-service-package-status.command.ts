import type { CrmActor } from '../shared/crm-actor.js';
import type { ChangeServicePackageStatusInput } from '../../domain/repositories/crm.repository.js';

export type ChangeServicePackageStatusCommand = {
  readonly actor: CrmActor;
  readonly packageId: string;
  readonly input: ChangeServicePackageStatusInput;
};
