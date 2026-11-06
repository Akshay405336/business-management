import { ClientCode } from '../value-objects/client-code.vo.js';

export class ClientNumberService {
  static formatFromSequence(sequence: number): string {
    const referenceNumber = `CL-${String(sequence).padStart(6, '0')}`;
    ClientCode.assertFormat(referenceNumber);
    return referenceNumber;
  }
}
