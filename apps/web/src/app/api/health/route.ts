import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function checkDatabase(): Promise<{ ok: boolean; latency: number }> {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latency: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latency: Math.round(performance.now() - start) };
  }
}

export async function GET() {
  const db = await checkDatabase();

  const status = db.ok ? 'healthy' : 'degraded';
  const statusCode = db.ok ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: db,
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    },
    { status: statusCode },
  );
}
