export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { order as orderSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!['NEW', 'PROCESSING', 'COMPLETED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existing = await db.query.order.findFirst({ where: eq(orderSchema.id, id) });
    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (existing.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Completed orders cannot be changed' }, { status: 400 });
    }

    const [order] = await db.update(orderSchema)
      .set({ status })
      .where(eq(orderSchema.id, id))
      .returning();

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Order PATCH error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
