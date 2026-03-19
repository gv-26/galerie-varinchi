export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { artistProfile as artistProfileSchema } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await db.query.artistProfile.findMany({
      where: eq(artistProfileSchema.status, 'PENDING'),
      orderBy: [desc(artistProfileSchema.createdAt)],
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Admin artist requests GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
