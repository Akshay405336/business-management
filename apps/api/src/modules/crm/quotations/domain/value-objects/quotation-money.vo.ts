/** Normalized money string with two decimal places (domain boundary). */
export class QuotationMoney {
  private constructor(readonly amount: string) {}

  static fromComputed(value: string): QuotationMoney {
    return new QuotationMoney(value);
  }
}
