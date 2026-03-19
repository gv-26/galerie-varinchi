export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { artistProfile as artistProfileSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const profile = await db.query.artistProfile.findFirst({
      where: eq(artistProfileSchema.userId, user.id),
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Artist profile GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
