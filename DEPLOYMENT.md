# Deployment Pathway

This repo has two deployable parts:

- `apps/api`: Fastify API with Prisma, BullMQ workers, WebSockets, M-Pesa callbacks, WhatsApp webhook, PostgreSQL, and Redis.
- `apps/mobile`: Expo React Native app that points at the deployed API through `EXPO_PUBLIC_API_URL`.

## Recommended Path

Use one managed app platform for the API plus managed PostgreSQL and Redis, then build the mobile app with EAS.

For a first production deployment, Railway is the simplest because the API, PostgreSQL, Redis, logs, and environment variables can live in one project. Render is also fine, but you will need to attach PostgreSQL and Redis services and wire the environment variables manually.

## API Deployment

### 1. Provision services

Create:

- One Node.js web service for `apps/api`.
- One PostgreSQL database.
- One Redis database.

### 2. Configure build and start commands

From the monorepo root, use:

```bash
pnpm install --frozen-lockfile
pnpm --filter @chama/api prisma:generate
pnpm --filter @chama/api build
```

Start command:

```bash
pnpm --filter @chama/api start
```

Release or migration command:

```bash
pnpm --filter @chama/api migrate:deploy
```

If the platform does not have a separate release command, run `migrate:deploy` once manually before the first production start and again before deploying schema changes.

### 3. Required environment variables

Set these on the API service:

```bash
NODE_ENV=production
PORT=<platform-provided-port>
HOST=0.0.0.0
DATABASE_URL=<managed-postgres-url>
REDIS_URL=<managed-redis-url>
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=30d
NATIONAL_ID_ENCRYPTION_KEY=<64-hex-character-key>
NATIONAL_ID_HASH_SALT=<random-salt>
MPESA_CALLBACK_URL_BASE=https://api.yourdomain.com
```

Add these when payments, SMS, push, and WhatsApp are ready:

```bash
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=
MPESA_CALLBACK_URL=https://api.yourdomain.com/mpesa/callback
MPESA_ENV=production
MPESA_B2C_INITIATOR_NAME=
MPESA_B2C_SECURITY_CREDENTIAL=
AT_USERNAME=
AT_API_KEY=
EXPO_ACCESS_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_PROVIDER=
WHATSAPP_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
```

Generate local secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 4. Health check

Use:

```text
/health
```

Expected response:

```json
{"status":"ok"}
```

### 5. Public URLs

The API must be reachable over HTTPS for:

- Mobile app requests.
- M-Pesa callbacks.
- WhatsApp webhook callbacks.
- WebSocket connections.

Set `MPESA_CALLBACK_URL_BASE` to the final API domain without a trailing slash.

## Mobile Deployment

### 1. Configure production API URL

Set this for the Expo build:

```bash
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

### 2. Build with EAS

From `apps/mobile`:

```bash
npx eas login
npx eas build:configure
npx eas build --platform android
```

For iOS:

```bash
npx eas build --platform ios
```

### 3. Submit when ready

```bash
npx eas submit --platform android
npx eas submit --platform ios
```

## First Deployment Order

1. Push the repo to GitHub.
2. Create managed PostgreSQL and Redis.
3. Create the API web service.
4. Add API environment variables.
5. Run Prisma migrations with `pnpm --filter @chama/api migrate:deploy`.
6. Deploy the API.
7. Confirm `https://api.yourdomain.com/health`.
8. Set `EXPO_PUBLIC_API_URL` for Expo.
9. Build the mobile app with EAS.
10. Test login, OTP, chama creation, payments, callbacks, and WebSocket updates.

## Production Notes

- Do not deploy with the local Docker Compose database. It is only for development.
- Use a persistent managed Redis; BullMQ jobs depend on it.
- Keep the API as a long-running service, not a serverless function, because it runs WebSockets and background workers.
- Run migrations before each schema-changing deploy.
- Use separate staging and production databases before testing live M-Pesa credentials.
