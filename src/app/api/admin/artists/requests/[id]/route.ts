export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { artistProfile as artistProfileSchema } from '@/db/schema';
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

    const requestDetails = await db.query.artistProfile.findFirst({
      where: eq(artistProfileSchema.id, id),
    });

    if (!requestDetails) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ request: requestDetails });
  } catch (error) {
    console.error('Admin artist request GET error:', error);
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

    const { action } = await request.json(); // 'APPROVE' or 'DECLINE'

    if (!['APPROVE', 'DECLINE'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const status = action === 'APPROVE' ? 'APPROVED' : 'DECLINED';

    const [updatedProfile] = await db.update(artistProfileSchema)
      .set({ status })
      .where(eq(artistProfileSchema.id, id))
      .returning();

    return NextResponse.json({ message: `Artist profile ${status.toLowerCase()}`, profile: updatedProfile });
  } catch (error) {
    console.error('Admin artist request POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
