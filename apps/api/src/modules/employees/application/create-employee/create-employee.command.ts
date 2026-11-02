import type { OrgAccessActor } from '../../../org-access/index.js';
import type { CreateEmployeeInput } from '../../domain/repositories/employee.repository.js';
import type { EmployeeActor } from '../shared/employee-actor.js';

export type CreateEmployeeCommand = {
  readonly actor: EmployeeActor;
  readonly accessActor: OrgAccessActor;
  readonly input: CreateEmployeeInput;
  /** Sign-in access to create with the employee; omitted for HR-only records. */
  readonly login?: { readonly password: string } | null;
};
