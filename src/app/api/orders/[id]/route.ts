export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

import { getCurrentUser } from '@/lib/auth';
import { sql } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await request.json();

    const [order] = await db
      .update(schema.order)
      .set({ status })
      .where(eq(schema.order.id, id))
      .returning();

    // Reverse commissions for refunds or cancellations
    if (status === 'REFUNDED' || status === 'CANCELLED') {
      const orderItems = await db.query.orderItem.findMany({
        where: eq(schema.orderItem.orderId, id),
      });

      const pendingLedgers = await db.query.commissionLedger.findMany({
        where: and(
          eq(schema.commissionLedger.status, 'PENDING'),
          inArray(
            schema.commissionLedger.orderItemId,
            orderItems.map((i) => i.id)
          )
        ),
      });

      for (const ledger of pendingLedgers) {
        await db
          .update(schema.commissionLedger)
          .set({ status: 'CANCELLED' })
          .where(eq(schema.commissionLedger.id, ledger.id));

        await db
          .update(schema.artistWallet)
          .set({
            pendingBalance: sql`GREATEST(0, "ArtistWallet"."pendingBalance" - ${ledger.artistShare})`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.artistWallet.artistId, ledger.artistId));

        await db
          .update(schema.product)
          .set({
            totalCommissionPaid: sql`GREATEST(0, "Product"."totalCommissionPaid" - ${ledger.artistShare})`,
          })
          .where(eq(schema.product.id, ledger.productId));
      }
    }

    return NextResponse.json({ order });
  } catch (error: unknown) {
    console.error('[orders/[id]] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { id } = await params;

    const order = await db.query.order.findFirst({
      where: eq(schema.order.id, id),
      with: { orderItems: { with: { product: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Users can only see their own orders; admins can see all
    if (!user.isAdmin && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error: unknown) {
    console.error('[orders/[id]] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

