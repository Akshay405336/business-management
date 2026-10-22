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
