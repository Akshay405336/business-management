import { Injectable } from '@nestjs/common';
import { verify } from 'otplib';
import type { TotpCodeVerifier, TotpVerification } from '../security.contracts.js';

/** Accept the previous/next 30-second step to tolerate small clock drift. */
const EPOCH_TOLERANCE_SECONDS = 30;

@Injectable()
export class OtplibTotpCodeVerifier implements TotpCodeVerifier {
  async verify(input: {
    secret: string;
    code: string;
    afterTimeStep: number | null;
  }): Promise<TotpVerification> {
    if (!/^\d{6}$/.test(input.code)) return { valid: false };
    try {
      const result = await verify({
        secret: input.secret,
        token: input.code,
        epochTolerance: EPOCH_TOLERANCE_SECONDS,
        ...(input.afterTimeStep === null ? {} : { afterTimeStep: input.afterTimeStep }),
      });
      return result.valid && 'timeStep' in result
        ? { valid: true, timeStep: result.timeStep }
        : { valid: false };
    } catch {
      return { valid: false };
    }
  }
}
