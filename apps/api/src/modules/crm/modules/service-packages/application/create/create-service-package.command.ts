import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { CreateServicePackageData } from '../../domain/types/service-package.types.js';

export interface CreateServicePackageCommand {
  readonly actor: CrmActor;
  readonly input: CreateServicePackageData;
}
