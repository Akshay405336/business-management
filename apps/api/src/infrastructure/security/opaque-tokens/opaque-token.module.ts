import { Module } from '@nestjs/common';
import { OPAQUE_TOKEN_SERVICE } from '../security.contracts.js';
import { Sha256OpaqueTokenService } from './opaque-token.service.js';

@Module({
  providers: [{ provide: OPAQUE_TOKEN_SERVICE, useClass: Sha256OpaqueTokenService }],
  exports: [OPAQUE_TOKEN_SERVICE],
})
export class OpaqueTokenModule {}
