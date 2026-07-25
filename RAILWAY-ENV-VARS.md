# Railway Environment Variables — 7 NOTES / Evora API

Set these in: **Railway Dashboard → evora-production → Variables**

## Required

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | `10000` | Railway injects this automatically |
| `HOST` | `0.0.0.0` | Required for Railway to route traffic |
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres` | Supabase **direct** connection (not pooler) |
| `SESSION_SECRET` | *(random 64-char string)* | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `CSRF_SECRET` | *(random 64-char string)* | Same command as above |
| `QR_SECRET` | *(random 64-char string)* | Used to sign QR tokens — **never change after tickets are issued** |

## CORS & URLs

| Variable | Value |
|---|---|
| `CORS_ORIGIN` | `https://evora.7notes.workers.dev` |
| `FRONTEND_URL` | `https://evora.7notes.workers.dev` |
| `API_BASE_URL` | `https://evora-production-8754.up.railway.app/api/v1` |

## Cookie Settings

| Variable | Value |
|---|---|
| `COOKIE_NAME` | `seven_notes_session` |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `none` |

## Google Drive (Payment Proof Storage)

| Variable | Value |
|---|---|
| `GOOGLE_DRIVE_ENABLED` | `true` |
| `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` | Paste full service account JSON as **one single line** |

**OR** use individual vars instead of KEY_JSON:

| Variable | Value |
|---|---|
| `GOOGLE_PROJECT_ID` | Your GCP project ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `service-account@project.iam.gserviceaccount.com` |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Paste private key with `\n` for newlines |

> ⚠️ When pasting `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` into Railway:
> - Use Railway's raw editor (not YAML)
> - It must be a single line — no actual newlines inside the JSON value
> - The private_key field inside has `\n` as literal two-char sequences, that's correct

## Telegram Notifications (Optional)

| Variable | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | Your chat/group ID |

## Production Accounts (for seed script)

| Variable | Value |
|---|---|
| `ADMIN_EMAIL` | `admin@7notes.in` |
| `ADMIN_PASSWORD` | *(strong password)* |
| `ORGANIZER_EMAIL` | `organizer@7notes.in` |
| `ORGANIZER_PASSWORD` | *(strong password)* |
| `SCANNER_EMAIL` | `scanner@7notes.in` |
| `SCANNER_PASSWORD` | *(strong password)* |

## Optional / Feature Flags

| Variable | Value | Notes |
|---|---|---|
| `LOG_LEVEL` | `info` | `debug` for more verbose |
| `PAYMENT_PROOF_MAX_SIZE_BYTES` | `5242880` | 5 MB default |
| `ENABLE_TEST_PAYMENT` | `false` | Set `true` only for testing |
| `HUSKY` | `0` | Disable husky in CI/CD |

## How to verify Drive is working

After deploy, hit:
```
GET https://evora-production-8754.up.railway.app/api/v1/admin/drive/test
```
(Must be logged in as admin)

Response `diagnosis: "ALL_GOOD"` = Drive is fully working.

---

## Railway Build & Start Commands

These are set in `railway.toml` at the repo root, but can also be overridden in Dashboard:

**Build:**
```
cd apps/api && npm install && npx prisma generate --schema=prisma/schema.prisma && npm run build
```

**Start:**
```
cd apps/api && npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/server.js
```
