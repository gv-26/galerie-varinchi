export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

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

    const { bankName, accountNumber, ifscCode, bankBranch } = await request.json();

    const [updated] = await db
      .update(schema.artistProfile)
      .set({ bankName, accountNumber, ifscCode, bankBranch, updatedAt: new Date().toISOString() })
      .where(eq(schema.artistProfile.id, profile.id))
      .returning();

    return NextResponse.json({ profile: updated });
  } catch (error: unknown) {
    console.error('[artist/wallet/bank] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
