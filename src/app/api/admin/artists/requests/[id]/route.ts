export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const request = await db.query.artistProfile.findFirst({
      where: eq(schema.artistProfile.id, id),
    });

    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ request });
  } catch (error: unknown) {
    console.error('[admin/artists/requests/[id]] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const { action } = await request.json();

    const [profile] = await db
      .update(schema.artistProfile)
      .set({ status: action === 'APPROVE' ? 'APPROVED' : 'DECLINED' })
      .where(eq(schema.artistProfile.id, id))
      .returning();

    return NextResponse.json({ profile });
  } catch (error: unknown) {
    console.error('[admin/artists/requests/[id]] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
