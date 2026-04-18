export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { processCommissionForOrder } from '@/lib/commission';

/**
 * GET /api/admin/maintenance?action=repair-artist-links
 *
 * One-time admin utility to backfill missing artistProfileId on Products
 * and reprocess commissions for any orders that are missing ledger entries.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);

    if (searchParams.get('action') === 'repair-artist-links') {
      // 1. Find products with no artistProfileId and try to match via artRequest title
      const orphanedProducts = await db.query.product.findMany({
        where: sql`"artistProfileId" IS NULL`,
      });

      let repairedCount = 0;
      for (const product of orphanedProducts) {
        const matchedRequest = await db.query.artRequest.findFirst({
          where: eq(schema.artRequest.title, product.title),
        });
        if (matchedRequest) {
          await db
            .update(schema.product)
            .set({ artistProfileId: matchedRequest.artistId })
            .where(eq(schema.product.id, product.id));
          repairedCount++;
        }
      }

      // 2. Reprocess commissions for orders with missing ledger entries
      const allOrders = await db.query.order.findMany({
        where: inArray(schema.order.status, ['NEW', 'PROCESSING', 'COMPLETED', 'DELIVERED']),
        with: { orderItems: true },
      });

      let processedOrders = 0;
      for (const order of allOrders) {
        const needsProcessing = await (async () => {
          for (const item of order.orderItems) {
            const hasLedger = await db.query.commissionLedger.findFirst({
              where: eq(schema.commissionLedger.orderItemId, item.id),
            });
            if (!hasLedger) return true;
          }
          return false;
        })();

        if (needsProcessing) {
          await processCommissionForOrder(order.id);
          processedOrders++;
        }
      }

      return NextResponse.json({
        success: true,
        repairedProductsCount: repairedCount,
        reprocessedOrdersCount: processedOrders,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[admin/maintenance] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
