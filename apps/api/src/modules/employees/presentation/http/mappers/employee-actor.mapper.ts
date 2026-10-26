import type { EmployeeActor } from '../../../application/access/employee-actor.js';

export type EmployeeRequestContext = {
  readonly organizationId: string;
  readonly adminId: string;
};

export function toEmployeeActor(context: EmployeeRequestContext): EmployeeActor {
  return {
    organizationId: context.organizationId,
    adminId: context.adminId,
  };
}
