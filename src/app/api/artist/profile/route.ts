export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/artist/profile
 * Returns the artist profile for the authenticated user.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const profile = await db.query.artistProfile.findFirst({
      where: eq(schema.artistProfile.userId, user.id),
    });

    return NextResponse.json({ profile: profile ?? null });
  } catch (error: unknown) {
    console.error('[artist/profile] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/artist/profile
 * Updates the authenticated user's own profile (allow-listed fields only).
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();

    // Explicitly allow-list editable fields to prevent mass-assignment
    const { name, phone, address } = body;
    const [updatedUser] = await db
      .update(schema.user)
      .set({ name, phone, address })
      .where(eq(schema.user.id, user.id))
      .returning();

    return NextResponse.json({ user: updatedUser });
  } catch (error: unknown) {
    console.error('[artist/profile] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
