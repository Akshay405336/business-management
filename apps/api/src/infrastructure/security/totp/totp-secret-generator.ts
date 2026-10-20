import { Inject, Injectable } from '@nestjs/common';
import { generateSecret, generateURI } from 'otplib';
import { APP_CONFIG, type AppConfig } from '../../../config/app-config.js';
import type { TotpSecretGenerator } from '../security.contracts.js';

@Injectable()
export class OtplibTotpSecretGenerator implements TotpSecretGenerator {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  /** 20 random bytes (160 bits) encoded as Base32, as recommended by RFC 4226. */
  generateSecret(): string {
    return generateSecret({ length: 20 });
  }

  buildEnrollmentUri(input: { secret: string; accountName: string }): string {
    return generateURI({
      issuer: this.config.totp.issuer,
      label: input.accountName,
      secret: input.secret,
    });
  }
}
