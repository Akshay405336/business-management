import type {
  ClientReferencePreviewResponse,
  ClientStatus,
  ClientType,
  CrmClient,
  CrmClientListResponse,
  CrmLeadConvertResponse,
} from '@techwin/contracts';
import { clientListQuerySchema } from '@techwin/validation';
import type {
  ChangeClientStatusRequest,
  CreateClientRequest,
  UpdateClientRequest,
} from '@techwin/validation';
import type { z } from 'zod';

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;

export type {
  ChangeClientStatusRequest,
  ClientReferencePreviewResponse,
  ClientStatus,
  ClientType,
  CreateClientRequest,
  CrmClient,
  CrmClientListResponse,
  CrmLeadConvertResponse,
  UpdateClientRequest,
};
