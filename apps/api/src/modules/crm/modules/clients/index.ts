export { CLIENT_REPOSITORY, type ClientRepository } from './domain/repositories/client.repository.js';
export type { ClientReadModel, ClientRecord } from './domain/types/client-read-model.js';
export type { ClientStatus } from './domain/enums/client-status.enum.js';
export type { ClientType } from './domain/enums/client-type.enum.js';

export { CreateClientHandler } from './application/create/create-client.handler.js';
export { UpdateClientHandler } from './application/update/update-client.handler.js';
export { GetClientHandler } from './application/get/get-client.handler.js';
export { ListClientsHandler } from './application/list/list-clients.handler.js';
export { DeleteClientHandler } from './application/delete/delete-client.handler.js';
export { ChangeClientStatusHandler } from './application/change-status/change-client-status.handler.js';
export { PreviewClientReferenceHandler } from './application/preview-reference/preview-client-reference.handler.js';

export { ClientController } from './presentation/controllers/client.controller.js';
export { PrismaClientRepository } from './infrastructure/persistence/prisma/repositories/prisma-client.repository.js';
export { toCrmClient } from './presentation/mappers/client-response.mapper.js';
export { ClientQuotationIntegration } from './application/quotation-integration/client-quotation.integration.js';
export {
  LEAD_TO_CLIENT_CONVERSION,
  type LeadToClientConversionPort,
} from './application/conversion/lead-to-client-conversion.port.js';
export {
  buildClientCreateFromLead,
  prepareClientCreateFromLead,
} from './application/conversion/lead-to-client.integration.js';
export { PrismaLeadToClientConversionAdapter } from './infrastructure/persistence/prisma/lead-to-client-conversion.adapter.js';
export { getClientRow } from './infrastructure/persistence/prisma/client-prisma.store.js';
