export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { artRequest as artRequestSchema } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawRequests = await db.query.artRequest.findMany({
      where: eq(artRequestSchema.status, 'PENDING'),
      with: { artistProfile: true },
      orderBy: [desc(artRequestSchema.createdAt)],
    });

    const requests = rawRequests.map(r => ({ ...r, artist: r.artistProfile }));

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Admin art requests GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
