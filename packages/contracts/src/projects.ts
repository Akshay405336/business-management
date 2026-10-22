import { API_PREFIX } from './http.js';

export const PROJECT_ROUTES = {
  projects: `${API_PREFIX}/projects`,
  project: (id: string) => `${API_PREFIX}/projects/${id}`,
  projectStatus: (id: string) => `${API_PREFIX}/projects/${id}/status`,
  projectNumberPreview: `${API_PREFIX}/projects/number-preview`,
  projectManagers: `${API_PREFIX}/projects/managers`,
  clientQuotations: (clientId: string) => `${API_PREFIX}/projects/clients/${clientId}/quotations`,
} as const;

export type ProjectStatus = 'ACTIVE' | 'INACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectLifecyclePhase =
  | 'PLANNING'
  | 'PRODUCTION'
  | 'QA'
  | 'DEPLOYMENT'
  | 'HANDOVER'
  | 'COMPLETED';

export type ProjectPhaseStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export type ProjectLifecycleTab = 'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED';

export interface ProjectManagerOption {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
}

export interface ProjectPhase {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly phase: ProjectLifecyclePhase;
  readonly status: ProjectPhaseStatus;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly ownerAdminId: string | null;
  readonly sortOrder: number;
}

export interface ProjectListItem {
  readonly id: string;
  readonly projectNumber: string;
  readonly name: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly companyName: string;
  readonly priority: ProjectPriority;
  readonly startDate: string;
  readonly status: ProjectStatus;
  readonly phaseCount: number;
  readonly progressPercent: number;
}

export interface ProjectDetail extends ProjectListItem {
  readonly description: string;
  readonly clientPhone: string;
  readonly clientEmail: string;
  readonly projectManagerAdminId: string | null;
  readonly projectManagerName: string | null;
  readonly expectedEndDate: string;
  readonly currentPhase: ProjectLifecyclePhase;
  readonly proposalId: string | null;
  readonly quotationNumber: string;
  readonly quotationTitle: string;
  readonly acceptedCommercialValue: string | null;
  readonly currency: string;
  readonly scopeAndRequirements: string;
  readonly mainDeliverables: string;
  readonly acceptanceCriteria: string;
  readonly internalNotes: string;
  readonly phases: readonly ProjectPhase[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectListTabCounts {
  readonly all: number;
  readonly upcoming: number;
  readonly ongoing: number;
  readonly completed: number;
}

export interface ProjectListResponse {
  readonly items: readonly ProjectListItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly tabCounts: ProjectListTabCounts;
}

export interface ProjectNumberPreviewResponse {
  readonly projectNumber: string;
  readonly isPreview: true;
}

export interface ClientQuotationOption {
  readonly id: string;
  readonly documentNumber: string;
  readonly title: string;
  readonly grandTotal: string;
  readonly status: string;
}

export interface ClientQuotationListResponse {
  readonly quotations: readonly ClientQuotationOption[];
}
