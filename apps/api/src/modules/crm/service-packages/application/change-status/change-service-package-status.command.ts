import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { ChangeServicePackageStatusData } from '../../domain/types/service-package.types.js';

export interface ChangeServicePackageStatusCommand {
  readonly actor: CrmActor;
  readonly packageId: string;
  readonly input: ChangeServicePackageStatusData;
}
