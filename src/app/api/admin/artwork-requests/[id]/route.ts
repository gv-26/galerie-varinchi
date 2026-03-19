import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const artRequest = await prisma.artRequest.findUnique({
      where: { id },
      include: {
        artist: true,
        category: true,
        subCategory: true,
      },
    });

    if (!artRequest) {
      return NextResponse.json({ error: 'Artwork request not found' }, { status: 404 });
    }

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

    const { action } = await request.json(); // ONLY 'DECLINE' or 'APPROVE' is expected. Approve happens via add-product sync usually but supporting decline here.

    if (action !== 'DECLINE') {
      return NextResponse.json({ error: 'Invalid action for this endpoint' }, { status: 400 });
    }

    const updated = await prisma.artRequest.update({
      where: { id },
      data: { status: 'DECLINED' },
    });

    return NextResponse.json({ message: 'Request declined', request: updated });
  } catch (error) {
    console.error('Admin artwork Decline POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
