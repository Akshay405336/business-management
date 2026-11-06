import type { ClientStatus } from '../enums/client-status.enum.js';
import type { ClientType } from '../enums/client-type.enum.js';

export const CLIENT_SEQUENCE_KEY = 'client' as const;

export interface CreateClientData {
  readonly type: ClientType;
  readonly name: string;
  readonly primaryContact?: string;
  readonly email?: string | null;
  /** Stored display phone (digits, max 32). */
  readonly phone: string;
  /** Canonical 10-digit key for duplicate detection. */
  readonly phoneNormalized: string;
  readonly website?: string | null;
  readonly billingAddress?: string;
  readonly taxRegistration?: string;
  readonly status?: ClientStatus;
  readonly notes?: string;
  readonly sourceLeadId?: string | null;
  readonly createdByAdminId: string;
}

export interface UpdateClientData {
  readonly type?: ClientType;
  readonly name?: string;
  readonly primaryContact?: string;
  readonly email?: string | null;
  readonly phone?: string;
  readonly phoneNormalized?: string;
  readonly website?: string | null;
  readonly billingAddress?: string;
  readonly taxRegistration?: string;
  readonly status?: ClientStatus;
  readonly notes?: string;
  readonly archivedAt?: Date | null;
}

export type ClientSortField = 'createdAt' | 'name' | 'referenceNumber';

export interface ClientListFilters {
  readonly search?: string;
  readonly status?: ClientStatus;
  readonly type?: ClientType;
  readonly includeArchived?: boolean;
  readonly createdFrom?: Date;
  readonly createdTo?: Date;
  readonly sort?: ClientSortField;
  readonly sortDir?: 'asc' | 'desc';
  readonly page: number;
  readonly pageSize: number;
}

export interface PaginatedClients {
  readonly items: readonly import('./client-read-model.js').ClientReadModel[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface ClientDependencyCounts {
  readonly projectCount: number;
  readonly quotationCount: number;
  readonly convertedLeadCount: number;
  readonly whatsAppContactCount: number;
}

/** Default page size when callers pass explicit pagination query params. */
export const CLIENT_LIST_DEFAULT_PAGE_SIZE = 25;

/**
 * When page/pageSize are omitted (legacy list consumers), return up to this many rows in one page.
 * Still uses DB skip/take — not an in-memory full scan.
 */
export const CLIENT_LIST_LEGACY_FIRST_PAGE_SIZE = 500;

export interface ClientAuditEntry {
  readonly type: import('../enums/client-event-type.enum.js').ClientAuditEventType;
  readonly adminId: string;
  readonly entityType: 'client';
  readonly entityId: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}
