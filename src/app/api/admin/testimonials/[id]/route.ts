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

    const [testimonial] = await db
      .update(schema.testimonial)
      .set({ isActive })
      .where(eq(schema.testimonial.id, id))
      .returning();

    return NextResponse.json({ testimonial });
  } catch (error: unknown) {
    console.error('[admin/testimonials/[id]] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    await db.delete(schema.testimonial).where(eq(schema.testimonial.id, id));

    return NextResponse.json({ message: 'Testimonial deleted' });
  } catch (error: unknown) {
    console.error('[admin/testimonials/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
