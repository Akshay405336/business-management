import type {
  ProjectExecutionLifecycle,
  ProjectLifecyclePhase,
  ProjectLifecycleTab,
  ProjectPhaseStatus,
  ProjectPriority,
  ProjectStatus,
} from '../project-types.js';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface ProjectListFilters {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly status?: ProjectStatus;
  readonly priority?: ProjectPriority;
  readonly lifecycleTab?: ProjectLifecycleTab;
}

export interface ProjectListTabCounts {
  readonly all: number;
  readonly notPlanned: number;
  readonly planned: number;
  readonly inProduction: number;
  readonly completed: number;
}

export interface ProjectPlanTaskInput {
  readonly id?: string;
  readonly title: string;
  readonly description?: string;
  readonly priority?: import('../project-task-types.js').ProjectTaskPriority;
  readonly assigneeAdminId?: string | null;
  readonly startDate?: string | null;
  readonly dueDate?: string | null;
}

export interface ProjectPlanPhaseInput extends ProjectPhaseInput {
  readonly tasks: readonly ProjectPlanTaskInput[];
}

export interface SaveProjectPlanInput {
  readonly phases: readonly ProjectPlanPhaseInput[];
}

export interface PaginatedProjects {
  readonly items: readonly ProjectListRecord[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly tabCounts: ProjectListTabCounts;
}

export interface ProjectPhaseRecord {
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

export interface ProjectPhaseInput {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly ownerAdminId?: string | null;
  readonly status?: ProjectPhaseStatus;
}

export interface ProjectListRecord {
  readonly id: string;
  readonly projectNumber: string;
  readonly name: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly companyName: string;
  readonly priority: ProjectPriority;
  readonly startDate: string;
  readonly status: ProjectStatus;
  readonly executionLifecycle: ProjectExecutionLifecycle;
  readonly actualProductionStartedAt: string | null;
  readonly actualCompletedAt: string | null;
  readonly phaseCount: number;
  readonly progressPercent: number;
}

export interface ProjectDetailRecord extends ProjectListRecord {
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
  readonly phases: readonly ProjectPhaseRecord[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateProjectInput {
  readonly name: string;
  readonly priority: ProjectPriority;
  readonly projectManagerAdminId?: string | null;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly description?: string;
  readonly clientId: string;
  readonly proposalId?: string | null;
  readonly acceptedCommercialValue?: string | null;
  readonly scopeAndRequirements?: string;
  readonly phases?: readonly ProjectPhaseInput[];
  readonly createdByAdminId: string;
}

export interface UpdateProjectInput {
  readonly name?: string;
  readonly priority?: ProjectPriority;
  readonly projectManagerAdminId?: string | null;
  readonly startDate?: string;
  readonly expectedEndDate?: string;
  readonly description?: string;
  readonly clientId?: string;
  readonly proposalId?: string | null;
  readonly acceptedCommercialValue?: string | null;
  readonly scopeAndRequirements?: string;
  readonly phases?: readonly ProjectPhaseInput[];
}

export interface ProjectManagerRecord {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
}

export interface ClientQuotationRecord {
  readonly id: string;
  readonly documentNumber: string;
  readonly title: string;
  readonly grandTotal: string;
  readonly status: string;
}

export interface ProjectRepository {
  listProjects(organizationId: string, filters: ProjectListFilters): Promise<PaginatedProjects>;
  getProject(organizationId: string, projectId: string): Promise<ProjectDetailRecord | null>;
  createProject(
    organizationId: string,
    input: CreateProjectInput,
    audit: { adminId: string | null },
  ): Promise<ProjectDetailRecord>;
  updateProject(
    organizationId: string,
    projectId: string,
    input: UpdateProjectInput,
    audit: { adminId: string | null },
  ): Promise<ProjectDetailRecord>;
  changeProjectStatus(
    organizationId: string,
    projectId: string,
    status: ProjectStatus,
    audit: { adminId: string | null },
  ): Promise<ProjectDetailRecord>;
  deleteProject(
    organizationId: string,
    projectId: string,
    audit: { adminId: string | null },
  ): Promise<void>;
  previewProjectNumber(organizationId: string): Promise<string>;
  listProjectManagers(organizationId: string): Promise<readonly ProjectManagerRecord[]>;
  listClientQuotations(
    organizationId: string,
    clientId: string,
  ): Promise<readonly ClientQuotationRecord[]>;
  saveProjectPlan(
    organizationId: string,
    projectId: string,
    input: SaveProjectPlanInput,
    audit: { adminId: string | null },
  ): Promise<ProjectDetailRecord>;
  startProduction(
    organizationId: string,
    projectId: string,
    audit: { adminId: string | null },
  ): Promise<ProjectDetailRecord>;
  completeProject(
    organizationId: string,
    projectId: string,
    audit: { adminId: string | null },
  ): Promise<ProjectDetailRecord>;
}
