export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingArtists = await prisma.artistProfile.count({
      where: { status: 'PENDING' },
    });

    const approvedArtists = await prisma.artistProfile.count({
      where: { status: 'APPROVED' },
    });

    const pendingArtworks = await prisma.artRequest.count({
      where: { status: 'PENDING' },
    });

    return NextResponse.json({
      pendingArtists,
      approvedArtists,
      pendingArtworks,
    });
  } catch (error) {
    console.error('Admin stats GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
