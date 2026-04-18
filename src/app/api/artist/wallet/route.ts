export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const profile = await db.query.artistProfile.findFirst({
      where: eq(schema.artistProfile.userId, user.id),
    });

    if (!profile) {
      return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product');

    // Per-product commission drill-down
    if (productId) {
      const ledgers = await db.query.commissionLedger.findMany({
        where: and(
          eq(schema.commissionLedger.artistId, profile.id),
          eq(schema.commissionLedger.productId, productId)
        ),
        orderBy: [desc(schema.commissionLedger.createdAt)],
      });

      const product = await db.query.product.findFirst({
        where: eq(schema.product.id, productId),
      });

      return NextResponse.json({
        product,
        ledgers,
        totalEarned: ledgers.reduce((s, l) => s + l.artistShare, 0),
        totalSales: ledgers.length,
      });
    }

    // Main wallet overview
    const [wallet, ledgers] = await Promise.all([
      db.query.artistWallet.findFirst({ where: eq(schema.artistWallet.artistId, profile.id) }),
      db.query.commissionLedger.findMany({
        where: eq(schema.commissionLedger.artistId, profile.id),
        orderBy: [desc(schema.commissionLedger.createdAt)],
        with: {
          product: { columns: { id: true, title: true, basePrice: true, totalCommissionPaid: true } },
          orderItem: { with: { order: { columns: { id: true, createdAt: true, status: true } } } },
        },
      }),
    ]);

    const totalEarned =
      Math.round(
        ledgers
          .filter((l) => l.status !== 'CANCELLED')
          .reduce((sum, l) => sum + (l.artistShare ?? 0), 0) * 100
      ) / 100;

    return NextResponse.json({
      wallet: wallet ?? { availableBalance: 0, pendingBalance: 0 },
      ledgers,
      totalEarned,
      totalSales: ledgers.length,
    });
  } catch (error: unknown) {
    console.error('[artist/wallet] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
