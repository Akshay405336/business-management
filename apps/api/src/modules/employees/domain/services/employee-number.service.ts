import { EmployeeCode } from '../value-objects/employee-code.vo.js';

export class EmployeeNumberService {
  static formatFromSequence(sequence: number): string {
    return EmployeeCode.fromSequence(sequence).value;
  }

  static previewFromLastValue(lastValue: number | null): string {
    return EmployeeNumberService.formatFromSequence((lastValue ?? 0) + 1);
  }
}
