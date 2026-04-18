export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray, desc, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);

    // Platform-wide financial totals
    if (searchParams.get('view') === 'stats') {
      const [revenueRes, commissionsRes, salesRes] = await Promise.all([
        db
          .select({ total: sql<number>`COALESCE(SUM("totalAmount"), 0)` })
          .from(schema.order)
          .where(inArray(schema.order.status, ['NEW', 'PROCESSING', 'COMPLETED'])),
        db
          .select({ total: sql<number>`COALESCE(SUM("artistShare"), 0)` })
          .from(schema.commissionLedger)
          .where(inArray(schema.commissionLedger.status, ['PENDING', 'COMPLETED'])),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.commissionLedger)
          .where(inArray(schema.commissionLedger.status, ['PENDING', 'COMPLETED'])),
      ]);

      return NextResponse.json({
        totalRevenue: Number(revenueRes[0].total),
        totalCommissions: Number(commissionsRes[0].total),
        totalSales: Number(salesRes[0].count),
      });
    }

    // Filtered ledger list
    const artistFilter = searchParams.get('artist')?.toLowerCase() ?? '';
    const productFilter = searchParams.get('product')?.toLowerCase() ?? '';

    const allLedgers = await db.query.commissionLedger.findMany({
      orderBy: [desc(schema.commissionLedger.createdAt)],
      with: {
        artistProfile: { columns: { fullName: true, email: true } },
        product: { columns: { title: true, basePrice: true } },
      },
    });

    const ledgers = allLedgers.filter((l) => {
      const artistMatch = !artistFilter || l.artistProfile?.fullName?.toLowerCase().includes(artistFilter);
      const productMatch = !productFilter || l.product?.title?.toLowerCase().includes(productFilter);
      return artistMatch && productMatch;
    });

    return NextResponse.json({ ledgers });
  } catch (error: unknown) {
    console.error('[admin/commissions] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
