export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const coupons = await db.query.coupon.findMany({
      orderBy: [desc(schema.coupon.createdAt)],
    });

    return NextResponse.json({ coupons });
  } catch (error: unknown) {
    console.error('[admin/coupons] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { code: rawCode, discountPercent, expiresAt } = await request.json();
    const code = rawCode?.toUpperCase().trim();

    if (!code || !discountPercent || discountPercent <= 0 || discountPercent > 100) {
      return NextResponse.json(
        { error: 'Valid code and discount percent (1–100) are required' },
        { status: 400 }
      );
    }

    const existing = await db.query.coupon.findFirst({ where: eq(schema.coupon.code, code) });
    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    }

    const [coupon] = await db
      .insert(schema.coupon)
      .values({
        id: crypto.randomUUID(),
        code,
        discountPercent,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      })
      .returning();

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error: unknown) {
    console.error('[admin/coupons] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
