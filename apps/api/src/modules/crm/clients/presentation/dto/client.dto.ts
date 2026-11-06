export {
  createClientRequestSchema as createClientBodySchema,
  updateClientRequestSchema as updateClientBodySchema,
  changeClientStatusRequestSchema as changeClientStatusBodySchema,
} from '@techwin/validation';

export {
  crmClientResponseSchema,
  crmLeadConvertResponseSchema,
} from '../../../presentation/http/dto/crm.schemas.js';
