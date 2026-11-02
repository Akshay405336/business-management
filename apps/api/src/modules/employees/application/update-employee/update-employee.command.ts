import type { OrgAccessActor } from '../../../org-access/index.js';
import type { UpdateEmployeeInput } from '../../domain/repositories/employee.repository.js';
import type { EmployeeActor } from '../shared/employee-actor.js';

export type UpdateEmployeeCommand = {
  readonly actor: EmployeeActor;
  readonly accessActor: OrgAccessActor;
  readonly employeeId: string;
  readonly input: UpdateEmployeeInput;
};
