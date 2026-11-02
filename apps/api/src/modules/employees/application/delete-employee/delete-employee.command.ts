import type { OrgAccessActor } from '../../../org-access/index.js';
import type { EmployeeActor } from '../shared/employee-actor.js';

export type DeleteEmployeeCommand = {
  readonly actor: EmployeeActor;
  readonly accessActor: OrgAccessActor;
  readonly employeeId: string;
};
