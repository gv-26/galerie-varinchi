export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    // Admins can see any profile; public can only see APPROVED profiles
    const whereClause = user?.isAdmin
      ? eq(schema.artistProfile.id, id)
      : and(eq(schema.artistProfile.id, id), eq(schema.artistProfile.status, 'APPROVED'));

    const profile = await db.query.artistProfile.findFirst({ where: whereClause });

    if (!profile) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error: unknown) {
    console.error('[artist/[id]] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
