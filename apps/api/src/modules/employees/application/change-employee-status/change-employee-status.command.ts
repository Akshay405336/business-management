import type { OrgAccessActor } from '../../../org-access/index.js';
import type { EmployeeEmploymentStatus } from '../../domain/repositories/employee.repository.js';
import type { EmployeeActor } from '../shared/employee-actor.js';

export type ChangeEmployeeStatusCommand = {
  readonly actor: EmployeeActor;
  readonly accessActor: OrgAccessActor;
  readonly employeeId: string;
  readonly status: EmployeeEmploymentStatus;
};
