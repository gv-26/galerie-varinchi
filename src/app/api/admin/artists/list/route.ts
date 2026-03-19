import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const artists = await prisma.artistProfile.findMany({
      where: { status: 'APPROVED' },
      orderBy: { fullName: 'asc' },
    });

    return NextResponse.json({ artists });
  } catch (error) {
    console.error('Admin artists list GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
