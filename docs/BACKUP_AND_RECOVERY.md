# Backup and Recovery Strategy

## Overview

Automated, verifiable database backups are required before enabling production
payments. This document covers the backup provider, schedule, retention policy,
and recovery procedures.

---

## Backup Provider

**Recommended:** Use the backup service built into the managed PostgreSQL provider.

| Provider       | Backup Feature                     | PITR Support | Cost                |
|----------------|------------------------------------|-------------|---------------------|
| Supabase       | Automated daily + PITR             | Yes (7 days)| Free tier includes  |
| Neon           | Automated daily + PITR (branches)  | Yes         | Free tier includes  |
| AWS RDS        | Automated daily + transaction logs | Yes (35 days)| Pay per use         |
| Cloud SQL      | Automated daily + PITR             | Yes (7 days)| Pay per use         |
| Railway        | Automated daily snapshots          | No          | Included            |
| Self-managed   | pg_dump + cron or pgBackRest       | Manual      | Infrastructure cost |

**For V1:** Use the provider's built-in backup if available (Supabase/Neon/Railway).
This avoids managing a separate backup infrastructure.

---

## Backup Frequency

| Backup Type     | Frequency  | Retention     | When                     |
|-----------------|-----------|---------------|--------------------------|
| Automated daily | Daily     | Minimum 7 days | Provider-managed         |
| Point-in-time   | Continuous| 7 days        | Provider-managed (if PITR enabled) |
| Manual          | Before every major migration | Until next manual backup | Before `prisma migrate deploy` |
| Manual          | Before production launch | Permanent (archive) | Initial full backup |

---

## Manual Backup Command

If using a self-managed PostgreSQL instance, create a manual backup:

```bash
# Full database dump
pg_dump \
  --host=<host> \
  --port=5432 \
  --username=<user> \
  --dbname=jamming \
  --format=custom \
  --file=jamming-$(date +%Y-%m-%d).dump

# Compressed SQL dump
pg_dump \
  --host=<host> \
  --port=5432 \
  --username=<user> \
  --dbname=jamming \
  --file=jamming-$(date +%Y-%m-%d).sql \
  -Z 9
```

**Store manual backups outside the deployment environment** (e.g., cloud storage
bucket with restricted access).

---

## Restore Procedure

### Restore from Custom Format Dump

```bash
pg_restore \
  --host=<host> \
  --port=5432 \
  --username=<user> \
  --dbname=jamming_restored \
  --verbose \
  jamming-2026-07-15.dump
```

### Restore from SQL Dump

```bash
psql \
  --host=<host> \
  --port=5432 \
  --username=<user> \
  --dbname=jamming_restored \
  -f jamming-2026-07-15.sql
```

### Restore from Provider Console

| Provider | Restore Method |
|----------|---------------|
| Supabase  | Database → Backups → Restore |
| Neon      | Branches → Restore from timestamp |
| AWS RDS   | Automated backups → Restore to point in time |
| Cloud SQL | Backups → Restore |

---

## Point-in-Time Recovery (PITR)

If the provider supports PITR, you can restore to any time within the retention
window (typically 7 days):

```bash
# Example: Restore to 14:30 UTC on July 15, 2026
pg_restore \
  --host=<host> \
  --port=5432 \
  --username=<user> \
  --dbname=jamming_recovered \
  --verbose \
  --target-time "2026-07-15 14:30:00 UTC" \
  jamming-backup.dump
```

---

## Migration Safety

Before running `prisma migrate deploy`:

1. Take a manual backup (see above).
2. Review the generated migration SQL in `prisma/migrations/`.
3. Check for destructive changes: `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN`.
4. Run the migration.
5. Verify application health.
6. Keep the pre-migration backup until the next successful migration.

**Never** run `prisma migrate reset` or `prisma db push --force-reset` in production.

---

## Automated Backup Verification

A backup is not complete until restore has been tested.

**Before production launch:**
1. Restore the latest backup to a temporary database.
2. Run `prisma migrate status` — confirm migrations are current.
3. Run a health check against the restored database.
4. Verify that test data (events, users, tickets) is present.
5. Document the restore test results.

**Ongoing:**
- Every quarter, perform a restore test to a staging environment.
- Verify that the restored application starts correctly.
- Log the test result (success/failure, duration, data integrity check).

---

## Last Successful Restore Test

| Date       | Backup Source | Target       | Duration | Result |
|------------|--------------|--------------|----------|--------|
| —          | —            | —            | —        | Not yet performed |

*This table must be updated after each successful restore test.*

---

## Responsibility

- **Developer**: Take manual backups before every migration.
- **DevOps/Admin**: Configure automated backups on the provider.
- **Lead**: Schedule and verify quarterly restore tests.

---

## Checklist Before Production Payments

- [ ] Automated daily backups configured.
- [ ] Retention policy set (minimum 7 days).
- [ ] Manual backup taken before first schema deployment.
- [ ] Restore procedure documented in team runbook.
- [ ] At least one restore test completed successfully.
- [ ] Restore test documented with date and result.
- [ ] Migration review process documented.
- [ ] PITR enabled if supported by provider.
- [ ] Emergency contact for database outage documented.
