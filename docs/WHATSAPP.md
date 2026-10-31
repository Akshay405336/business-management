# WhatsApp Business Cloud API

Techwin talks to WhatsApp only through Meta's official **WhatsApp Business Cloud API** (Graph API). No WhatsApp Web automation, QR sessions or unofficial libraries are used. All Meta-specific code lives in `apps/api/src/modules/whatsapp/infrastructure/meta/meta-cloud-api.provider.ts`.

## What you need from Meta

1. A **Meta Business Portfolio** (business.facebook.com), ideally verified.
2. A **Meta app** of type _Business_ with the **WhatsApp** product added (developers.facebook.com).
3. A **WhatsApp Business Account (WABA)** with at least one registered phone number. Note its **Phone number ID** and **WhatsApp Business Account ID** (WhatsApp → API Setup).
4. A **permanent access token** from a **System User** (Business Settings → Users → System users):
   - Assign the app and the WABA to the system user with full control.
   - Generate a token with the permissions `whatsapp_business_messaging` and `whatsapp_business_management` (add `business_management` if you use Embedded Signup).
   - Temporary tokens from the API Setup page expire after 24 hours; do not use them in production.
5. The **App secret** (App settings → Basic). It is used to verify webhook signatures.

## Environment variables (API only)

Set these in the API environment (Coolify or `.env`). None of them are read by the browser; never add a `NEXT_PUBLIC_` prefix.

| Variable                              | Required                         | Description                                                                                                                                                                                                  |
| ------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `WHATSAPP_CREDENTIALS_ENCRYPTION_KEY` | Yes, before connecting a channel | Base64 32-byte key. Access tokens, app secrets and verify tokens are encrypted with AES-256-GCM using this key. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |
| `WHATSAPP_CREDENTIALS_PREVIOUS_KEYS`  | No                               | Comma-separated old keys still accepted for decryption during key rotation.                                                                                                                                  |
| `WHATSAPP_WEBHOOK_BASE_URL`           | Yes for production               | Public `https` origin Meta can reach, e.g. `https://crm.example.com`. The channels page shows the full callback URL.                                                                                         |
| `META_APP_SECRET`                     | Recommended                      | Default app secret for webhook signature checks when a channel was saved without its own.                                                                                                                    |
| `META_APP_ID`                         | Embedded Signup only             | Numeric app ID.                                                                                                                                                                                              |
| `META_EMBEDDED_SIGNUP_CONFIG_ID`      | Embedded Signup only             | Facebook Login for Business configuration ID.                                                                                                                                                                |
| `META_GRAPH_API_VERSION`              | No                               | Defaults to `v23.0`.                                                                                                                                                                                         |
| `META_GRAPH_API_BASE_URL`             | No                               | Defaults to `https://graph.facebook.com`.                                                                                                                                                                    |
| `WHATSAPP_MEDIA_MAX_BYTES`            | No                               | Media size ceiling (default 16 MB). Meta's own per-type limits still apply: images 5 MB, video and audio 16 MB, documents 100 MB. Browser uploads are additionally capped at 64 MB per file.                 |
| `WHATSAPP_WORKER_ENABLED`             | No                               | Default `true`. Set `false` on extra API replicas; a Redis lock already keeps a single active worker.                                                                                                        |

Media is stored through the existing storage service (S3 in production, see `docs/STORAGE.md`) under the `WHATSAPP_MEDIA` category; it is never stored in PostgreSQL.

## Connecting a channel (manual)

1. Open **Communications → WhatsApp Channels** and click **Connect channel**.
2. Enter a channel name, the WABA ID, the Phone number ID, the System User access token and (recommended) the app secret.
3. Generate a **verify token** (or type your own) and save. Techwin verifies the credentials against the Graph API before storing anything, subscribes the app to the WABA, and then shows:
   - the **Callback URL** (`https://<WHATSAPP_WEBHOOK_BASE_URL>/api/v1/webhooks/whatsapp/<channel key>`), and
   - the **verify token** — shown once only.
4. In the Meta app go to **WhatsApp → Configuration → Webhook**, click **Edit**, paste the Callback URL and verify token, and click **Verify and save**. The channel moves from _Webhook Not Verified_ to _Connected_ when Meta's verification succeeds or the first signed event arrives.
5. Under **Webhook fields** subscribe to `messages` and `message_template_status_update`.
6. Click **Sync templates** to import your approved message templates.

Channel states: **Connected**, **Pending Setup**, **Webhook Not Verified**, **Connection Error** (Meta rejected the token or the number is unavailable — rotate credentials), **Disconnected** (access token wiped; history kept).

## Embedded Signup (optional)

The **Embedded Signup** button appears only when `META_APP_ID`, `META_EMBEDDED_SIGNUP_CONFIG_ID`, `META_APP_SECRET` and the encryption key are configured. Requirements on Meta's side:

- The app must be a Tech Provider / Solution Partner app with **Facebook Login for Business** and an Embedded Signup configuration for WhatsApp.
- Add the web origin to **Allowed domains** for the JavaScript SDK.

The browser only receives a short-lived authorization code; the API exchanges it for a token server-side using the app secret. The token never reaches the browser.

## Credential handling

- Tokens and secrets are encrypted at rest and never returned by the API; the UI shows a masked suffix only.
- **Rotate credentials** re-verifies a new token before replacing the old one. Audit entries record that credentials changed, never their values.
- **Disconnect** wipes the stored access token and stops sending; conversations remain readable, and **Reconnect** (rotate credentials) restores the channel.
- **Delete** removes the channel from the list, wipes every stored credential and cancels its pending broadcasts. Conversation history is kept for audit.
- Encryption key rotation: set the new key as `WHATSAPP_CREDENTIALS_ENCRYPTION_KEY`, move the old one to `WHATSAPP_CREDENTIALS_PREVIOUS_KEYS`, restart, then rotate each channel's credentials (which re-encrypts with the new key) before removing the old key.

## Webhook security

- `GET /api/v1/webhooks/whatsapp/:channelKey` answers Meta's verification challenge only when the verify token matches (constant-time comparison of hashes).
- `POST /api/v1/webhooks/whatsapp/:channelKey` requires a valid `X-Hub-Signature-256` HMAC over the raw body using the channel's app secret (or `META_APP_SECRET`). Invalid or missing signatures get `403`.
- The organization is derived from the unguessable channel key, never from the payload. Events for a different phone number ID or WABA are ignored.
- Duplicate deliveries are de-duplicated by body hash and by Meta message ID. Processing is asynchronous with retries; Meta receives `200` quickly.
- The endpoint is excluded from the global IP rate limit (Meta delivers from shared IPs) and has its own per-channel limit.

## Messaging rules enforced

- Free-form messages (text and media) are only allowed within **24 hours of the customer's last message**. Outside the window only **approved templates** can be sent, and only to contacts with recorded opt-in.
- Contacts who reply `STOP`, `STOP ALL`, `UNSUBSCRIBE` or `OPT OUT` are marked opted out automatically and excluded from templates and broadcasts.
- Internal notes are stored separately and are never sent to WhatsApp.
- Message status follows Meta's receipts: _Queued → Sent → Delivered → Read_ or _Failed_. A message is never marked delivered just because Meta accepted the request.
- Templates submitted from Techwin stay _Pending_ until Meta's status webhook reports a decision.
- Broadcasts require an approved template, an explicit confirmation, and recipients with recorded opt-in; each recipient is sent at most once (idempotency key per recipient).

## Permissions

| Permission                   | Grants                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `whatsapp.read`              | Open the inbox (own and unassigned conversations).                                 |
| `whatsapp.view_all`          | See every conversation and the reports page.                                       |
| `whatsapp.reply`             | Send messages, notes, consent and CRM link changes; take unassigned conversations. |
| `whatsapp.assign`            | Assign conversations to any eligible employee.                                     |
| `whatsapp.channels.manage`   | Connect, test, rotate, disconnect and delete channels.                             |
| `whatsapp.templates.manage`  | Sync and submit templates.                                                         |
| `whatsapp.broadcasts.manage` | Create and cancel broadcasts.                                                      |

Agents must be linked to an active employee profile to be assigned conversations.

## Troubleshooting

- **Verification fails in Meta**: the callback URL must be public `https` and the verify token must match exactly. Check `WHATSAPP_WEBHOOK_BASE_URL`.
- **Messages arrive in Meta but not in Techwin**: confirm the `messages` webhook field is subscribed and that the app secret saved on the channel (or `META_APP_SECRET`) matches the Meta app; signature mismatches are rejected with `403`.
- **Connection Error**: the token was revoked or lacks permissions. Generate a new System User token and use **Rotate credentials**.
- **Template not selectable**: only `APPROVED` templates without media headers can be sent from the inbox and broadcasts. Sync templates after Meta approves them.
