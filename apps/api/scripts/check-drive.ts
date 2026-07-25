import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const proofs = await p.paymentProof.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      storageProvider: true,
      googleDriveFileId: true,
      googleDriveViewUrl: true,
      utrNumber: true,
      submittedAt: true,
    },
  });
  console.log('\n📋 Recent payment proofs:\n');
  console.log(JSON.stringify(proofs, null, 2));
  console.log(`\nTotal: ${proofs.length}`);
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
