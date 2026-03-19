export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { user as userSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const [updated] = await db.update(userSchema)
      .set({
        name: body.name ?? user.name,
        phone: body.phone ?? user.phone,
        address: body.address ?? user.address,
      })
      .where(eq(userSchema.id, user.id))
      .returning();

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
