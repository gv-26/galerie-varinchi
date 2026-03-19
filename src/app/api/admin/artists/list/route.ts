export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { artistProfile as artistProfileSchema } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const artists = await db.query.artistProfile.findMany({
      where: eq(artistProfileSchema.status, 'APPROVED'),
      orderBy: [asc(artistProfileSchema.fullName)],
    });

    return NextResponse.json({ artists });
  } catch (error) {
    console.error('Admin artists list GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
