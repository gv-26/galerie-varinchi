export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const { isActive } = await request.json();

    const [coupon] = await db
      .update(schema.coupon)
      .set({ isActive })
      .where(eq(schema.coupon.id, id))
      .returning();

    return NextResponse.json({ coupon });
  } catch (error: unknown) {
    console.error('[admin/coupons/[id]] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    await db.delete(schema.coupon).where(eq(schema.coupon.id, id));

    return NextResponse.json({ message: 'Coupon deleted' });
  } catch (error: unknown) {
    console.error('[admin/coupons/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
