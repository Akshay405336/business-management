export class EmployeeName {
  private constructor(
    readonly firstName: string,
    readonly lastName: string,
  ) {}

  static create(firstName: string, lastName: string): EmployeeName {
    return new EmployeeName(firstName.trim(), lastName.trim());
  }

  get displayName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  static displayName(firstName: string, lastName: string): string {
    return EmployeeName.create(firstName, lastName).displayName;
  }
}
