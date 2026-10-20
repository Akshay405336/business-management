import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { SignJWT } from 'jose';
import { APP_CONFIG, type AppConfig } from '../../../config/app-config.js';
import type { AccessTokenClaims, AccessTokenSigner } from '../security.contracts.js';

export const ACCESS_TOKEN_TYPE = 'platform-access+jwt';
export const ACCESS_TOKEN_ALGORITHM = 'HS256';

@Injectable()
export class JoseAccessTokenSigner implements AccessTokenSigner {
  private readonly key: Uint8Array;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.key = new TextEncoder().encode(config.jwt.accessSecret);
  }

  sign(claims: AccessTokenClaims, expiresAt: Date): Promise<string> {
    return new SignJWT({ sid: claims.sessionId, role: claims.role })
      .setProtectedHeader({ alg: ACCESS_TOKEN_ALGORITHM, typ: ACCESS_TOKEN_TYPE })
      .setSubject(claims.subject)
      .setIssuer(this.config.jwt.issuer)
      .setAudience(this.config.jwt.audience)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .setJti(randomUUID())
      .sign(this.key);
  }
}
