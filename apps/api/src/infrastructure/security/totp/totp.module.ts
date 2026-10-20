import { Module } from '@nestjs/common';
import { TOTP_CODE_VERIFIER, TOTP_SECRET_GENERATOR } from '../security.contracts.js';
import { OtplibTotpCodeVerifier } from './totp-code-verifier.js';
import { OtplibTotpSecretGenerator } from './totp-secret-generator.js';

@Module({
  providers: [
    { provide: TOTP_CODE_VERIFIER, useClass: OtplibTotpCodeVerifier },
    { provide: TOTP_SECRET_GENERATOR, useClass: OtplibTotpSecretGenerator },
  ],
  exports: [TOTP_CODE_VERIFIER, TOTP_SECRET_GENERATOR],
})
export class TotpModule {}
