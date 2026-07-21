/**
 * Prisma seed script — Entry point for `npx prisma db seed`.
 *
 * Delegates to the shared seed function in apps/api so there's a single
 * source of truth for staging data. Works both locally and on Render.
 *
 * Usage:
 *   APP_ENV=staging npx prisma db seed --schema=prisma/schema.prisma
 *
 * Safety: refuses to run when NODE_ENV=production (unless ALLOW_PRODUCTION_SEED=true).
 */

// Dynamic import so we can use the same Prisma client instance from the API module.
// The seed function in apps/api handles all safety checks (NODE_ENV, idempotency).
async function main() {
  // Use tsx/node to resolve the monorepo path
  const { seedStagingData } = await import('../apps/api/src/modules/admin/seed.js');

  console.log('🌱 Seeding staging database via shared seed function...\n');

  const results = await seedStagingData();

  console.log(results.map((r: string) => `  ✓ ${r}`).join('\n'));
  console.log('\n✅ Staging seed complete!');
}

main().catch((e: unknown) => {
  const message = e instanceof Error ? e.message : 'Unknown error';
  console.error('❌ Seed failed:', message);
  process.exit(1);
});
