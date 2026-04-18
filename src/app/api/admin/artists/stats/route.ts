export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [pendingArtists, approvedArtists, pendingArtworks] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(schema.artistProfile).where(eq(schema.artistProfile.status, 'PENDING')),
      db.select({ count: sql<number>`count(*)` }).from(schema.artistProfile).where(eq(schema.artistProfile.status, 'APPROVED')),
      db.select({ count: sql<number>`count(*)` }).from(schema.artRequest).where(eq(schema.artRequest.status, 'PENDING')),
    ]);

    return NextResponse.json({
      pendingArtists: Number(pendingArtists[0].count),
      approvedArtists: Number(approvedArtists[0].count),
      pendingArtworks: Number(pendingArtworks[0].count),
    });
  } catch (error: unknown) {
    console.error('[admin/artists/stats] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
