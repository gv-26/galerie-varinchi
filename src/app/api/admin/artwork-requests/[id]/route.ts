export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { artRequest as artRequestSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawRequest = await db.query.artRequest.findFirst({
      where: eq(artRequestSchema.id, id),
      with: {
        artistProfile: true,
        category: true,
        subCategory: true,
      },
    });

    if (!rawRequest) {
      return NextResponse.json({ error: 'Artwork request not found' }, { status: 404 });
    }

    const artRequest = { ...rawRequest, artist: rawRequest.artistProfile };

    return NextResponse.json({ request: artRequest });
  } catch (error) {
    console.error('Admin art request review GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json(); 

    if (action !== 'DECLINE') {
      return NextResponse.json({ error: 'Invalid action for this endpoint' }, { status: 400 });
    }

    const [updated] = await db.update(artRequestSchema)
      .set({ status: 'DECLINED' })
      .where(eq(artRequestSchema.id, id))
      .returning();

    return NextResponse.json({ message: 'Request declined', request: updated });
  } catch (error) {
    console.error('Admin artwork Decline POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
