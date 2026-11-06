export type CalendarDateRangeProps = {
  readonly startDate: string;
  readonly endDate: string;
};

export class CalendarDateRange {
  private constructor(private readonly props: CalendarDateRangeProps) {}

  static create(startDate: string, endDate: string): CalendarDateRange {
    return new CalendarDateRange({ startDate, endDate });
  }

  get startDate(): string {
    return this.props.startDate;
  }

  get endDate(): string {
    return this.props.endDate;
  }
}
