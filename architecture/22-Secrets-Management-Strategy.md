# Architecture 22: Secrets Management Strategy

## Purpose
Define how secrets (API keys, database passwords, private keys) are stored, accessed, and rotated.

## Principles

1. **Never in code** — No secrets in source files, commit history, or comments
2. **Environment isolation** — Different keys per environment (dev/staging/prod)
3. **Least privilege** — Each service gets only the secrets it needs
4. **Rotation** — Regular rotation schedule with automated reminders
5. **Auditable** — All secret access is logged

## Strategy

| Secret Type | Development | Staging | Production |
|-------------|-------------|---------|------------|
| Database URL | `.env.local` | Vercel Env | Vercel Env (encrypted) |
| API Keys | `.env.local` | Vercel Env | Vercel Env (encrypted) |
| JWT Secret | `.env.local` | Vercel Env | Vault (rotated) |
| ETH Private Key | `.env.local` | Vault | Hardware wallet |
| Stripe Keys | Test keys | Test keys | Live keys (Vault) |

## Rotation Schedule

| Secret | Rotation | Automated? | Impact |
|--------|----------|-----------|--------|
| NEXTAUTH_SECRET | 90 days | Script | Invalidates all sessions (graceful) |
| QR_SECRET_KEY | 90 days | Script | Invalidates existing QR codes (graceful) |
| DATABASE_URL | On suspicion | Manual | Requires migration |
| Stripe keys | On suspicion | Dashboard | No impact (API key change) |
| ETH private key | On suspicion | Manual | Requires contract ownership transfer |
| R2 keys | 180 days | Script | Brief upload disruption |

## Emergency Response

| Scenario | Action | Timeline |
|----------|--------|----------|
| Secret leaked to GitHub | Rotate immediately, use GitHub secret scanning | < 1 hour |
| Database credentials exposed | Rotate DB password, revoke old credentials | < 15 min |
| ETH private key compromised | Transfer contract ownership, deploy new contract | < 1 hour |
| API key abused | Rotate key, review usage logs | < 15 min |

## Tools

| Tool | Purpose |
|------|---------|
| `.env.example` | Template for required variables |
| `git-secrets` | Pre-commit hook preventing secret commits |
| GitHub secret scanning | Automated scanning of all commits |
| Vercel Environment Variables | Encrypted storage for staging + production |
| Hardware wallet | ETH private key storage for production contract owner |
