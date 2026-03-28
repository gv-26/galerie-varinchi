import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const upperCode = code.toUpperCase().trim();
    const c = await db.query.coupon.findFirst({ where: eq(schema.coupon.code, upperCode) });

    if (!c || !c.isActive) {
      return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 400 });
    }

    if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
    }

    if (c.discountPercent > 0) {
      return NextResponse.json({ discount: c.discountPercent });
    } else {
      return NextResponse.json({ error: 'Invalid coupon discount' }, { status: 400 });
    }
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
