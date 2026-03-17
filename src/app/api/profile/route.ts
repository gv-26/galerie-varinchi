import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: body.name ?? user.name,
        phone: body.phone ?? user.phone,
        address: body.address ?? user.address,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
