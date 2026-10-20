import { Inject, Injectable } from '@nestjs/common';
import { jwtVerify } from 'jose';
import { APP_CONFIG, type AppConfig } from '../../../config/app-config.js';
import type { AccessTokenClaims, AccessTokenVerifier } from '../security.contracts.js';
import { ACCESS_TOKEN_ALGORITHM, ACCESS_TOKEN_TYPE } from './access-token.signer.js';

const MAX_TOKEN_LENGTH = 4096;

@Injectable()
export class JoseAccessTokenVerifier implements AccessTokenVerifier {
  private readonly key: Uint8Array;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.key = new TextEncoder().encode(config.jwt.accessSecret);
  }

  async verify(token: string): Promise<AccessTokenClaims | null> {
    if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: [ACCESS_TOKEN_ALGORITHM],
        typ: ACCESS_TOKEN_TYPE,
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
        requiredClaims: ['sub', 'exp', 'iat', 'sid'],
        clockTolerance: 5,
      });
      const { sub, sid, role } = payload;
      if (typeof sub !== 'string' || typeof sid !== 'string' || typeof role !== 'string') {
        return null;
      }
      return { subject: sub, sessionId: sid, role };
    } catch {
      return null;
    }
  }
}
