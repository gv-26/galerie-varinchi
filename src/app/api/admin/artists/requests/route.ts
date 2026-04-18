export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const requests = await db.query.artistProfile.findMany({
      where: eq(schema.artistProfile.status, 'PENDING'),
    });

    return NextResponse.json({ requests });
  } catch (error: unknown) {
    console.error('[admin/artists/requests] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
