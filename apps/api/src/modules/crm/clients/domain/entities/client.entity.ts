import type { ClientStatus } from '../enums/client-status.enum.js';
import { ClientStatusPolicy } from '../policies/client-status.policy.js';
import { ClientCreationPolicy } from '../policies/client-creation.policy.js';
import { ClientUpdatePolicy } from '../policies/client-update.policy.js';
import type { ClientReadModel } from '../types/client-read-model.js';
import type { CreateClientData, UpdateClientData } from '../types/client.types.js';

export class Client {
  private constructor(private readonly snapshot: ClientReadModel) {}

  static reconstitute(readModel: ClientReadModel): Client {
    return new Client(readModel);
  }

  static validateCreate(input: CreateClientData): CreateClientData {
    return ClientCreationPolicy.validate(input);
  }

  static validateUpdate(input: UpdateClientData): UpdateClientData {
    return ClientUpdatePolicy.validatePatch(input);
  }

  get id(): string {
    return this.snapshot.id;
  }

  get organizationId(): string {
    return this.snapshot.organizationId;
  }

  get status(): ClientStatus {
    return this.snapshot.status;
  }

  toReadModel(): ClientReadModel {
    return this.snapshot;
  }

  withStatus(next: ClientStatus): Client {
    ClientStatusPolicy.assertTransition(this.snapshot.status, next);
    return new Client({ ...this.snapshot, status: next });
  }

  applyUpdate(patch: UpdateClientData): ClientReadModel {
    const validated = ClientUpdatePolicy.validatePatch(patch);
    return {
      ...this.snapshot,
      type: validated.type ?? this.snapshot.type,
      name: validated.name ?? this.snapshot.name,
      primaryContact: validated.primaryContact ?? this.snapshot.primaryContact,
      email: validated.email !== undefined ? validated.email : this.snapshot.email,
      phone: validated.phone !== undefined ? validated.phone : this.snapshot.phone,
      phoneNormalized:
        validated.phone !== undefined && validated.phoneNormalized !== undefined
          ? validated.phoneNormalized
          : this.snapshot.phoneNormalized,
      website: validated.website !== undefined ? validated.website : this.snapshot.website,
      billingAddress: validated.billingAddress ?? this.snapshot.billingAddress,
      taxRegistration: validated.taxRegistration ?? this.snapshot.taxRegistration,
      status: validated.status ?? this.snapshot.status,
      notes: validated.notes ?? this.snapshot.notes,
      archivedAt:
        validated.archivedAt !== undefined ? validated.archivedAt : this.snapshot.archivedAt,
      updatedAt: this.snapshot.updatedAt,
    };
  }
}
