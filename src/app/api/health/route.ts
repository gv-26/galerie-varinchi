export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { sql } from 'drizzle-orm';
import { getS3Client } from '@/lib/s3';

export async function GET() {
  try {
    await db.select({ count: sql`count(*)` }).from(schema.user).limit(1);

    let s3Status: string;
    try {
      getS3Client();
      s3Status = 'initialized';
    } catch (err: unknown) {
      s3Status = `error: ${err instanceof Error ? err.message : 'unknown'}`;
    }

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      s3: s3Status,
      time: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[health] GET error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
