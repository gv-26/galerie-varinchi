export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();

    // Explicitly allow-list updatable fields — prevents mass-assignment
    const { name, phone, address } = body;
    const [updatedUser] = await db
      .update(schema.user)
      .set({ name, phone, address })
      .where(eq(schema.user.id, user.id))
      .returning();

    return NextResponse.json({ user: updatedUser });
  } catch (error: unknown) {
    console.error('[profile] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
