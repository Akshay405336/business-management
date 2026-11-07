import type { EmployeeEmploymentStatus } from '../enums/employee-employment-status.enum.js';
import { EmployeeCreationPolicy } from '../policies/employee-creation.policy.js';
import { EmployeeDeletionPolicy } from '../policies/employee-deletion.policy.js';
import { EmployeeStatusPolicy } from '../policies/employee-status.policy.js';
import { EmployeeUpdatePolicy } from '../policies/employee-update.policy.js';
import type {
  CreateEmployeeInput,
  EmployeeRecord,
  UpdateEmployeeInput,
} from '../types/employee.types.js';

export class Employee {
  private constructor(private readonly snapshot: EmployeeRecord) {}

  static reconstitute(record: EmployeeRecord): Employee {
    return new Employee(record);
  }

  static validateCreate(input: CreateEmployeeInput): CreateEmployeeInput {
    return EmployeeCreationPolicy.validate(input);
  }

  static validateUpdate(input: UpdateEmployeeInput): UpdateEmployeeInput {
    return EmployeeUpdatePolicy.validate(input);
  }

  get id(): string {
    return this.snapshot.id;
  }

  get employmentStatus(): EmployeeEmploymentStatus {
    return this.snapshot.employmentStatus;
  }

  get platformAdminId(): string | null {
    return this.snapshot.platformAdminId;
  }

  toRecord(): EmployeeRecord {
    return this.snapshot;
  }

  withStatus(next: EmployeeEmploymentStatus): Employee {
    EmployeeStatusPolicy.assertTransition(this.snapshot.employmentStatus, next);
    return new Employee({ ...this.snapshot, employmentStatus: next });
  }

  assertDeletableBy(actorAdminId: string): void {
    EmployeeDeletionPolicy.assertActorCanDelete(actorAdminId, this.snapshot.platformAdminId);
  }
}
