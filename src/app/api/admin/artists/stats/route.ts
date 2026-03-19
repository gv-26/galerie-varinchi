export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { artistProfile as artistProfileSchema, artRequest as artRequestSchema } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [pendingArtistsQuery, approvedArtistsQuery, pendingArtworksQuery] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(artistProfileSchema).where(eq(artistProfileSchema.status, 'PENDING')),
      db.select({ count: sql<number>`count(*)` }).from(artistProfileSchema).where(eq(artistProfileSchema.status, 'APPROVED')),
      db.select({ count: sql<number>`count(*)` }).from(artRequestSchema).where(eq(artRequestSchema.status, 'PENDING'))
    ]);

    return NextResponse.json({
      pendingArtists: Number(pendingArtistsQuery[0]?.count || 0),
      approvedArtists: Number(approvedArtistsQuery[0]?.count || 0),
      pendingArtworks: Number(pendingArtworksQuery[0]?.count || 0),
    });
  } catch (error) {
    console.error('Admin stats GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
