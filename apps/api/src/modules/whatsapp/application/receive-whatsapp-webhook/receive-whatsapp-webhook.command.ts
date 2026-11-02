export interface ReceiveWhatsAppWebhookCommand {
  readonly channelKey: string;
  readonly rawBody: Buffer | undefined;
  readonly signature: string | undefined;
}
