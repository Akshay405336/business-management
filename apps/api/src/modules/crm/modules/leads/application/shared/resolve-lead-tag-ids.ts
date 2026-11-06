import type { LeadRepository } from '../../domain/repositories/lead.repository.js';

export async function resolveLeadTagIdsForWrite(
  tags: LeadRepository,
  organizationId: string,
  input: { readonly tagIds?: readonly string[]; readonly tags?: readonly string[] },
): Promise<string[] | undefined> {
  if (input.tagIds !== undefined) return [...input.tagIds];
  if (!input.tags?.length) return undefined;
  const resolved = await tags.resolveTagIdsByNames(organizationId, input.tags);
  if (resolved.missing.length > 0) {
    throw new Error(`Unknown tag(s): ${resolved.missing.join(', ')}.`);
  }
  return resolved.tagIds;
}
