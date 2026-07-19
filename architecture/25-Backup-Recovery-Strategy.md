# Architecture 25: Backup & Recovery Strategy

## Purpose
Define how data is backed up, how recovery is performed, and how to respond to data loss events.

## Backup Schedule

| Data | Backup Type | Frequency | Retention | Storage |
|------|-----------|-----------|-----------|---------|
| PostgreSQL | Automated snapshot | Daily | 30 days | Neon built-in |
| PostgreSQL | Point-in-time recovery | Continuous | 7 days | Neon built-in |
| PostgreSQL | Manual export | Before deployments | 7 days | R2 |
| Redis (Upstash) | Automatic | Continuous | 7 days | Upstash |
| File storage (R2) | Replication | Continuous | Forever | R2 |
| Environment variables | Manual export | Per change | Per deployment | Vault/Vercel |
| Audit logs | Archive | Monthly | 1 year | Cold storage |
| Smart contract | Git commit | On deploy | Forever | GitHub + Etherscan |

## Recovery Procedures

### Database Corruption

```bash
# 1. Identify the corruption
npx prisma db push --dry-run  # Check schema integrity

# 2. Restore from latest snapshot
# Neon: Point-in-time recovery via dashboard
# Or: psql jamming < backup_2026_04_15.sql

# 3. Verify data integrity
npm run db:verify  # Custom script checking data consistency

# 4. If needed, roll back application:
vercel rollback jamming --time=15m

# RTO: < 30 minutes
```

### Complete Database Loss

```bash
# 1. Restore from daily snapshot
# Neon: Restore from backup in dashboard

# 2. Apply any missing migrations
npx prisma migrate deploy

# 3. Re-seed non-critical data (if needed)
npx prisma db seed

# 4. Re-generate all QR codes (tickets unaffected, QR content from DB)
npm run regenerate-qrs

# RTO: < 1 hour
```

### Security Incident (Data Breach)

```text
1. Isolate: Take application offline, revoke compromised keys
2. Assess: Determine scope of breach (audit logs)
3. Notify: Inform affected users within 72 hours (GDPR)
4. Restore: Roll back to pre-breach state if possible
5. Rotate: All secrets, all API keys
6. Patch: Fix vulnerability that led to breach
7. Resume: Deploy patched version

RTO: < 4 hours
```

## Disaster Recovery Testing

| Test | Frequency | Expected Result |
|------|-----------|----------------|
| Database restore from backup | Monthly | Data intact, all queries work |
| Full environment rebuild | Quarterly | New environment from scratch in < 1 hour |
| PITR test | Quarterly | Restore to specific point in time |
| Failover test | Quarterly | Secondary region ready (future) |

## Data Integrity Verification

```sql
-- Automated integrity checks
-- Run daily
SELECT 
  'Ticket-count' as check_name,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM tickets WHERE status = 'ACTIVE' AND event_id IN (
  SELECT id FROM events WHERE status = 'ACTIVE'
);
```
