import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLogger } from '@/lib/logger';
import { writeAuditLog, getRequestMetadata } from '@/lib/audit';
import { storage, ensureProductionStorage } from '@/lib/storage';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const log = createLogger('api/dashboard/upload');

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, RATE_LIMITS.upload);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.remaining, rateCheck.resetIn);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 },
      );
    }

    // In production, validate that persistent storage is configured
    if (process.env.NODE_ENV === 'production') {
      ensureProductionStorage();
    }

    // Upload via storage abstraction (local filesystem for dev, S3/R2 for prod)
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const url = await storage.upload(buffer, filename, file.type);

    await writeAuditLog({
      action: 'UPLOAD_COMPLETED',
      entityType: 'Upload',
      entityId: filename,
      actorId: session.user.id,
      metadata: { filename, size: file.size, type: file.type, url },
      ...getRequestMetadata(request),
    });

    log.info({ filename, size: file.size, type: file.type }, 'File uploaded');

    return NextResponse.json({ url, filename });
  } catch (error) {
    log.error({ error }, 'File upload failed');
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
