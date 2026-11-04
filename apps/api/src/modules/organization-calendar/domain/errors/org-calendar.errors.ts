export class OrgCalendarNotFoundError extends Error {
  readonly code = 'ORG_CALENDAR_NOT_FOUND' as const;
  constructor(what = 'Calendar event') {
    super(`${what} was not found.`);
    this.name = 'OrgCalendarNotFoundError';
  }
}

export class OrgCalendarConflictError extends Error {
  readonly code = 'ORG_CALENDAR_CONFLICT' as const;
  constructor(message: string) {
    super(message);
    this.name = 'OrgCalendarConflictError';
  }
}

export class OrgCalendarValidationError extends Error {
  readonly code = 'ORG_CALENDAR_VALIDATION' as const;
  constructor(message: string) {
    super(message);
    this.name = 'OrgCalendarValidationError';
  }
}
