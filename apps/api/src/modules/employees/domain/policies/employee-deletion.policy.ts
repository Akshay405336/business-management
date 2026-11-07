import { EmployeeConflictError, EmployeeHasPendingTasksError } from '../errors/employee.errors.js';
import type { EmployeeDailyTaskDeletionImpact } from '../types/employee.types.js';

export class EmployeeDeletionPolicy {
  /**
   * Deletion is permanent. Attendance, leave, and salary follow their foreign keys.
   * WhatsApp assignment is cleared. Completed daily-task rows, activity, assignments,
   * and notes stay, with the employee's name and code stored on those rows.
   * An actor cannot delete the employee record linked to their own sign-in account.
   * Assigned tasks that are not on a completed workflow stage block deletion.
   */
  static assertActorCanDelete(actorAdminId: string, targetPlatformAdminId: string | null): void {
    if (targetPlatformAdminId && targetPlatformAdminId === actorAdminId) {
      throw new EmployeeConflictError('You cannot delete your own employee record.');
    }
  }

  static assertNoPendingDailyTasks(impact: EmployeeDailyTaskDeletionImpact): void {
    if (impact.pendingTaskCount > 0) {
      throw new EmployeeHasPendingTasksError(impact);
    }
  }
}
