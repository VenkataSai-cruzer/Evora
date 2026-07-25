/**
 * Local Drive upload test — run with real GOOGLE_* env vars set.
 * Tests the exact same flow as the payment proof upload.
 */
import { GoogleDriveService } from '../src/infrastructure/storage/google-drive.service.js';

async function main() {
  console.log('🔍 Google Drive Upload Test\n');

  const enabled = process.env.GOOGLE_DRIVE_ENABLED;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
  const email   = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key     = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const project = process.env.GOOGLE_PROJECT_ID;

  console.log('Config:');
  console.log(`  GOOGLE_DRIVE_ENABLED:               ${enabled}`);
  console.log(`  GOOGLE_SERVICE_ACCOUNT_KEY_JSON:    ${keyJson ? `set (${keyJson.length} chars)` : 'NOT SET'}`);
  console.log(`  GOOGLE_SERVICE_ACCOUNT_EMAIL:       ${email || 'NOT SET'}`);
  console.log(`  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: ${key ? `set (${key.length} chars)` : 'NOT SET'}`);
  console.log(`  GOOGLE_PROJECT_ID:                  ${project || 'NOT SET'}\n`);

  if (enabled !== 'true') {
    console.error('❌ GOOGLE_DRIVE_ENABLED is not true. Set it and retry.');
    process.exit(1);
  }

  if (!keyJson && !(email && key)) {
    console.error('❌ No credentials found. Set GOOGLE_SERVICE_ACCOUNT_KEY_JSON or individual vars.');
    process.exit(1);
  }

  try {
    const svc = new GoogleDriveService();

    console.log('1. Testing connectivity (list root folder)...');
    const connectivity = await svc.testConnectivity();
    console.log(`   ✓ Connected. Folders under root: ${connectivity.folders.join(', ') || '(none yet)'}\n`);

    console.log('2. Testing upload (small test PNG)...');
    const result = await svc.uploadTestFile();
    console.log(`   ✓ Upload succeeded!`);
    console.log(`   File ID:  ${result.fileId}`);
    console.log(`   View URL: ${result.viewUrl}\n`);

    console.log('3. Cleaning up test file...');
    await svc.deleteFile(result.fileId);
    console.log('   ✓ Deleted\n');

    console.log('✅ Google Drive is fully working! Payment proofs will upload correctly.');
  } catch (err: any) {
    console.error('\n❌ Drive test failed:');
    console.error('   Error:', err.message || err);
    if (err.response?.data) {
      console.error('   API response:', JSON.stringify(err.response.data, null, 2));
    }
    console.error('\n💡 Most common fixes:');
    console.error('   1. Share "Evora Payment Proofs" Drive folder with service account email as Editor');
    console.error('   2. Enable Google Drive API in your GCP project');
    console.error('   3. Check service account has "drive.file" scope');
    process.exit(1);
  }
}

main();
