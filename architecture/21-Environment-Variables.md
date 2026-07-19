# Architecture 21: Environment Variables

## Purpose
Complete inventory of all environment variables required, their purpose, and where they come from.

## Required Variables (All Phases)

```env
# === Database ===
DATABASE_URL=postgresql://user:password@host:5432/jamming
# PostgreSQL connection string (Neon/Supabase/self-hosted)

# === Authentication ===
NEXTAUTH_SECRET=<generated-random-string>
# Used to encrypt JWT tokens. Generate via: openssl rand -base64 32

NEXTAUTH_URL=https://jamming.com
# The canonical URL of the site. Used by NextAuth for callbacks.

# === QR Security ===
QR_SECRET_KEY=<generated-random-string>
# HMAC key for QR code signatures. Rotate if compromised.
# Should be at least 32 characters, cryptographically random.

# === Rate Limiting ===
UPSTASH_REDIS_REST_URL=https://<region>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
# Redis connection for rate limiting (Upstash serverless Redis)

# === File Storage ===
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET_NAME=jamming-uploads
# Cloudflare R2 (S3-compatible) credentials
```

## Phase 2 Variables

```env
# === Payments (Stripe) ===
STRIPE_SECRET_KEY=sk_live_<key>
STRIPE_PUBLISHABLE_KEY=pk_live_<key>
STRIPE_WEBHOOK_SECRET=whsec_<secret>
# Stripe API keys. Use test keys for development (sk_test_, pk_test_)

# === Blockchain (Ethereum Sepolia) ===
ETH_RPC_URL=https://sepolia.infura.io/v3/<project-id>
# Ethereum RPC endpoint. Infura/Alchemy/self-hosted

ETH_PRIVATE_KEY=0x<64-char-hex>
# Private key for the smart contract owner wallet
# Store in a vault, NOT in plaintext. Use hardware wallet in production.

TICKET_CONTRACT_ADDRESS=0x<address>
# Deployed smart contract address

BLOCKCHAIN_SECRET=<generated-random-string>
# Server secret used as input for ticket hash generation

# === Email (SendGrid/Resend) ===
RESEND_API_KEY=re_<key>
# API key for transactional email service

# === Google OAuth ===
GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<secret>

# === Application ===
LOG_LEVEL=info
# Pino log level: debug | info | warn | error

NODE_ENV=development
# Environment: development | staging | production
```

## Variable Sources

| Variable | Source | Rotate |
|----------|--------|--------|
| DATABASE_URL | Neon dashboard | On breach |
| NEXTAUTH_SECRET | Generated locally | Every 90 days |
| QR_SECRET_KEY | Generated locally | Every 90 days |
| STRIPE_SECRET_KEY | Stripe dashboard | On suspicion |
| ETH_PRIVATE_KEY | Generated via wallet | Only if compromised |
| RESEND_API_KEY | Resend dashboard | On suspicion |
| R2 keys | Cloudflare dashboard | On suspicion |

## Secrets Management

| Environment | Storage | Access |
|-------------|---------|--------|
| Development | `.env.local` (gitignored) | Developer's machine |
| Staging | Vercel Environment Variables | CI/CD only |
| Production | Vercel Environment Variables (encrypted) | CI/CD + Admin |

## .env.example

```env
# Copy this to .env.local and fill in values
DATABASE_URL=postgresql://localhost:5432/jamming
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
QR_SECRET_KEY=your-qr-secret-here
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=jamming-uploads
LOG_LEVEL=debug
```
