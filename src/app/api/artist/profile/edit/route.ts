export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/artist/profile/edit
 * Allows an approved artist to update their bio, portfolio, contact, and specialization.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const profile = await db.query.artistProfile.findFirst({
      where: eq(schema.artistProfile.userId, user.id),
    });

    if (!profile) {
      return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 });
    }

    const body = await request.json();

    // Explicitly allow-list editable fields
    const { bio, portfolioLink, phone, specialization } = body;
    const [updated] = await db
      .update(schema.artistProfile)
      .set({ bio, portfolioLink, phone, specialization, updatedAt: new Date().toISOString() })
      .where(eq(schema.artistProfile.id, profile.id))
      .returning();

    return NextResponse.json({ profile: updated });
  } catch (error: unknown) {
    console.error('[artist/profile/edit] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
