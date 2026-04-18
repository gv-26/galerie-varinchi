export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);
    const status = searchParams.get('status');

    const list = await db.query.order.findMany({
      where: status ? eq(schema.order.status, status) : undefined,
      with: { orderItems: { with: { product: true } } },
      orderBy: [desc(schema.order.createdAt)],
    });

    let csv = 'Order ID,Date,Customer,Email,Phone,Amount,Status,Items\n';
    for (const o of list) {
      const itemsStr = o.orderItems
        .map((i) => `${i.product?.title ?? 'Unknown'} (${i.quantity})`)
        .join('; ');
      csv += `${o.id},${o.createdAt},${o.customerName ?? ''},${o.customerEmail},${o.customerPhone ?? ''},${o.totalAmount},${o.status},"${itemsStr}"\n`;
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders-${status ?? 'all'}.csv"`,
      },
    });
  } catch (error: unknown) {
    console.error('[orders/export] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
