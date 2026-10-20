import { Module } from '@nestjs/common';
import { PASSWORD_HASHER } from '../security.contracts.js';
import { Argon2PasswordHasher } from './password-hasher.js';

@Module({
  providers: [{ provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher }],
  exports: [PASSWORD_HASHER],
})
export class PasswordHashingModule {}
