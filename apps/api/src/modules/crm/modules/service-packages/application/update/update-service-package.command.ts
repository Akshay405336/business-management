import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { UpdateServicePackageData } from '../../domain/types/service-package.types.js';

export interface UpdateServicePackageCommand {
  readonly actor: CrmActor;
  readonly packageId: string;
  readonly input: UpdateServicePackageData;
}
