import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { StreamLegacyProfileImageQuery } from './stream-legacy-profile-image.query.js';
import type { StreamLegacyProfileImageResult } from './stream-legacy-profile-image.result.js';

@Injectable()
export class StreamLegacyProfileImageHandler {
  execute(query: StreamLegacyProfileImageQuery): StreamLegacyProfileImageResult {
    if (query.organizationId !== query.trustedOrganizationId) {
      return { kind: 'not_found' };
    }
    if (!/^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i.test(query.fileName)) {
      return { kind: 'not_found' };
    }
    const absolutePath = join(
      process.cwd(),
      'data',
      'uploads',
      'employees',
      query.organizationId,
      query.fileName,
    );
    if (!existsSync(absolutePath)) {
      return { kind: 'not_found' };
    }
    return { kind: 'stream', absolutePath };
  }
}
