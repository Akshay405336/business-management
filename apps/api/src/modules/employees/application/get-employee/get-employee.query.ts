import type { EmployeeActor } from '../shared/employee-actor.js';

export type GetEmployeeQuery = {
  readonly actor: EmployeeActor;
  readonly employeeId: string;
};
