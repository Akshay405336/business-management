/** Identity claims taken from a verified access token. */
export interface GetCurrentSessionQuery {
  readonly adminId: string;
  readonly sessionId: string;
}
