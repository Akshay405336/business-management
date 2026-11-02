import type { EmployeeActor } from '../shared/employee-actor.js';

export type ListAssignableEmployeesQuery = {
  readonly actor: EmployeeActor;
  readonly search?: string;
};
