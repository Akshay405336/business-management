import { Module } from '@nestjs/common';
import { ACCESS_TOKEN_SIGNER, ACCESS_TOKEN_VERIFIER } from '../security.contracts.js';
import { JoseAccessTokenSigner } from './access-token.signer.js';
import { JoseAccessTokenVerifier } from './access-token.verifier.js';

@Module({
  providers: [
    { provide: ACCESS_TOKEN_SIGNER, useClass: JoseAccessTokenSigner },
    { provide: ACCESS_TOKEN_VERIFIER, useClass: JoseAccessTokenVerifier },
  ],
  exports: [ACCESS_TOKEN_SIGNER, ACCESS_TOKEN_VERIFIER],
})
export class JwtSecurityModule {}
