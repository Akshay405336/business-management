import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  PLATFORM_CSRF_HEADER,
  type PlatformAccessTokenResponse,
  type PlatformCurrentSessionResponse,
  type PlatformLoginResponse,
  type PlatformLogoutAllResponse,
  type PlatformSessionListResponse,
  type PlatformVerifyTotpResponse,
} from '@techwin/contracts';
import type { Request, Response } from 'express';
import {
  Client,
  type ClientContext,
} from '../../../../../common/decorators/client-context.decorator.js';
import {
  ACCESS_TOKEN_VERIFIER,
  type AccessTokenVerifier,
} from '../../../../../infrastructure/security/security.contracts.js';
import { ListSessionsHandler } from '../../../application/list-sessions/list-sessions.handler.js';
import { LoginWithPasswordHandler } from '../../../application/login-with-password/login-with-password.handler.js';
import { LogoutAllDevicesHandler } from '../../../application/logout-all-devices/logout-all-devices.handler.js';
import { LogoutHandler } from '../../../application/logout/logout.handler.js';
import { RefreshSessionHandler } from '../../../application/refresh-session/refresh-session.handler.js';
import { RevokeSessionHandler } from '../../../application/revoke-session/revoke-session.handler.js';
import { VerifyTotpHandler } from '../../../application/verify-totp/verify-totp.handler.js';
import { PlatformAuthCookies } from '../cookies/platform-auth.cookies.js';
import {
  apiErrorResponseSchema,
  platformAccessTokenResponseSchema,
  platformCurrentSessionResponseSchema,
  platformLoginBodySchema,
  platformLoginResponseSchema,
  platformLogoutAllResponseSchema,
  platformSessionIdParamSchema,
  platformSessionListResponseSchema,
  platformVerifyTotpBodySchema,
  platformVerifyTotpResponseSchema,
  toOpenApiSchema,
} from '../dto/platform-auth.schemas.js';
import { toPlatformLoginResponse, type PlatformLoginDto } from '../dto/platform-login.dto.js';
import {
  toAccessTokenResponse,
  toCurrentSessionResponse,
  toSessionSummary,
  toVerifyTotpResponse,
  type PlatformVerifyTotpDto,
} from '../dto/platform-verify-totp.dto.js';
import { PlatformAuthExceptionFilter } from '../filters/platform-auth-exception.filter.js';
import { CurrentPlatformAuth } from '../guards/current-platform-auth.decorator.js';
import {
  extractBearerToken,
  PlatformAdminGuard,
  type PlatformAuthContext,
} from '../guards/platform-admin.guard.js';

const errorSchema = toOpenApiSchema(apiErrorResponseSchema);
const csrfHeader = {
  name: PLATFORM_CSRF_HEADER,
  required: true,
  description: 'Value of the `tw_platform_csrf` cookie (double-submit CSRF token).',
};

@ApiTags('Platform authentication')
@Controller('auth/platform')
@UseFilters(PlatformAuthExceptionFilter)
export class PlatformAuthController {
  constructor(
    @Inject(LoginWithPasswordHandler) private readonly loginWithPassword: LoginWithPasswordHandler,
    @Inject(VerifyTotpHandler) private readonly verifyTotpCode: VerifyTotpHandler,
    @Inject(RefreshSessionHandler) private readonly refreshSession: RefreshSessionHandler,
    @Inject(ListSessionsHandler) private readonly listSessions: ListSessionsHandler,
    @Inject(RevokeSessionHandler) private readonly revokeSession: RevokeSessionHandler,
    @Inject(LogoutHandler) private readonly logoutSession: LogoutHandler,
    @Inject(LogoutAllDevicesHandler) private readonly logoutAllDevices: LogoutAllDevicesHandler,
    @Inject(PlatformAuthCookies) private readonly cookies: PlatformAuthCookies,
    @Inject(ACCESS_TOKEN_VERIFIER) private readonly accessTokens: AccessTokenVerifier,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email and password',
    description:
      'Super Admin accounts receive a TOTP challenge cookie. Other roles receive a session immediately when credentials are valid.',
  })
  @ApiOkResponse({ schema: toOpenApiSchema(platformLoginResponseSchema) })
  @ApiResponse({ status: 401, description: 'INVALID_CREDENTIALS', schema: errorSchema })
  @ApiResponse({ status: 429, description: 'RATE_LIMITED', schema: errorSchema })
  async login(
    @Body({ schema: platformLoginBodySchema }) body: PlatformLoginDto,
    @Client() client: ClientContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PlatformLoginResponse> {
    const result = await this.loginWithPassword.execute({ ...body, ...client });
    if (result.kind === 'session') {
      this.cookies.clearChallenge(response);
      this.cookies.setSession(response, result);
      return toPlatformLoginResponse(result);
    }
    this.cookies.setChallenge(response, result.challengeToken, result.challengeExpiresAt);
    return toPlatformLoginResponse(result);
  }

  @Post('verify-totp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete sign-in with an authenticator code',
    description:
      'Consumes the challenge cookie, creates a session, sets the refresh and CSRF cookies and returns an access token.',
  })
  @ApiCookieAuth('platform-challenge')
  @ApiOkResponse({ schema: toOpenApiSchema(platformVerifyTotpResponseSchema) })
  @ApiResponse({
    status: 401,
    description: 'INVALID_TOTP_CODE (retry) or CHALLENGE_EXPIRED (sign in again)',
    schema: errorSchema,
  })
  async verifyTotp(
    @Body({ schema: platformVerifyTotpBodySchema }) body: PlatformVerifyTotpDto,
    @Client() client: ClientContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PlatformVerifyTotpResponse> {
    const result = await this.verifyTotpCode.execute({
      challengeToken: this.cookies.readChallengeToken(request),
      code: body.code,
      ...client,
    });
    this.cookies.clearChallenge(response);
    this.cookies.setSession(response, result);
    return toVerifyTotpResponse(result);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the refresh token and issue a new access token',
    description: 'Reusing a rotated refresh token revokes the entire session.',
  })
  @ApiCookieAuth('platform-refresh')
  @ApiHeader(csrfHeader)
  @ApiOkResponse({ schema: toOpenApiSchema(platformAccessTokenResponseSchema) })
  @ApiResponse({ status: 401, description: 'SESSION_EXPIRED', schema: errorSchema })
  @ApiResponse({ status: 403, description: 'CSRF_REJECTED', schema: errorSchema })
  async refresh(
    @Client() client: ClientContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PlatformAccessTokenResponse> {
    const result = await this.refreshSession.execute({
      refreshToken: this.cookies.readRefreshToken(request),
      csrfToken: this.cookies.readCsrfHeader(request),
      ...client,
    });
    this.cookies.setSession(response, result);
    return toAccessTokenResponse(result);
  }

  @Get('me')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current administrator and session' })
  @ApiOkResponse({ schema: toOpenApiSchema(platformCurrentSessionResponseSchema) })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHENTICATED, ACCESS_TOKEN_INVALID or SESSION_EXPIRED',
    schema: errorSchema,
  })
  me(@CurrentPlatformAuth() auth: PlatformAuthContext): PlatformCurrentSessionResponse {
    return toCurrentSessionResponse(auth);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke the current session and clear auth cookies',
    description:
      'Identifies the session by refresh cookie (with CSRF header) or, failing that, by bearer token. Idempotent.',
  })
  @ApiHeader({ ...csrfHeader, required: false })
  @ApiNoContentResponse()
  async logout(
    @Client() client: ClientContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const bearer = extractBearerToken(request);
    const claims = bearer ? await this.accessTokens.verify(bearer) : null;
    await this.logoutSession.execute({
      refreshToken: this.cookies.readRefreshToken(request),
      csrfToken: this.cookies.readCsrfHeader(request),
      accessTokenSessionId: claims?.sessionId ?? null,
      accessTokenAdminId: claims?.subject ?? null,
      ...client,
    });
    this.cookies.clearSession(response);
  }

  @Get('sessions')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active sessions of the current administrator' })
  @ApiOkResponse({ schema: toOpenApiSchema(platformSessionListResponseSchema) })
  async sessions(
    @CurrentPlatformAuth() auth: PlatformAuthContext,
  ): Promise<PlatformSessionListResponse> {
    const result = await this.listSessions.execute({
      adminId: auth.adminId,
      currentSessionId: auth.sessionId,
    });
    return { sessions: result.sessions.map(toSessionSummary) };
  }

  @Delete('sessions/:sessionId')
  @UseGuards(PlatformAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke one of the current administrator’s sessions' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 404, description: 'SESSION_NOT_FOUND', schema: errorSchema })
  async revoke(
    @Param('sessionId', { schema: platformSessionIdParamSchema }) sessionId: string,
    @CurrentPlatformAuth() auth: PlatformAuthContext,
    @Client() client: ClientContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const result = await this.revokeSession.execute({
      adminId: auth.adminId,
      currentSessionId: auth.sessionId,
      sessionId,
      ...client,
    });
    if (result.wasCurrentSession) this.cookies.clearSession(response);
  }

  @Post('logout-all')
  @UseGuards(PlatformAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke every session of the current administrator' })
  @ApiOkResponse({ schema: toOpenApiSchema(platformLogoutAllResponseSchema) })
  async logoutAll(
    @CurrentPlatformAuth() auth: PlatformAuthContext,
    @Client() client: ClientContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PlatformLogoutAllResponse> {
    const result = await this.logoutAllDevices.execute({ adminId: auth.adminId, ...client });
    this.cookies.clearSession(response);
    return { revokedSessions: result.revokedSessions };
  }
}
