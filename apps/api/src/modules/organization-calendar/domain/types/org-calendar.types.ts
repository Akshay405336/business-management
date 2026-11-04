import type {
  OrgCalendarEventItem,
  OrgCalendarEventType,
  OrgCalendarRecurrence,
} from '@techwin/contracts';

export type OrgCalendarEventRecord = OrgCalendarEventItem;

export type OrgCalendarEventWriteInput = {
  readonly title: string;
  readonly description: string;
  readonly eventType: OrgCalendarEventType;
  readonly startDate: string;
  readonly endDate: string;
  readonly isFullDay: boolean;
  readonly startTimeMinutes: number | null;
  readonly endTimeMinutes: number | null;
  readonly color: string;
  readonly isActive: boolean;
  readonly appliesToAllEmployees: boolean;
  readonly employeeIds: readonly string[];
  readonly recurrence: OrgCalendarRecurrence;
};

export type OrgCalendarListQuery = {
  readonly from: string;
  readonly to: string;
  readonly eventTypes?: readonly string[];
  readonly search?: string;
  readonly page: number;
  readonly pageSize: number;
  readonly activeOnly: boolean;
};

export type OrgCalendarMonthQuery = {
  readonly year: number;
  readonly month: number;
  readonly eventTypes?: readonly string[];
  readonly search?: string;
};

export type OrgCalendarHolidaysQuery = {
  readonly year?: number;
  readonly eventTypes?: readonly string[];
  readonly search?: string;
  readonly page: number;
  readonly pageSize: number;
};
