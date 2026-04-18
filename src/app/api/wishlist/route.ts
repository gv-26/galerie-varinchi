export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { getImages } from '@/lib/product-utils';
import crypto from 'crypto';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ items: [] });

    const list = await db.query.wishlistItem.findMany({
      where: eq(schema.wishlistItem.userId, user.id),
      with: { product: true },
    });

    const items = list.map((item) => ({
      id: item.id,
      productId: item.productId,
      title: item.product.title,
      image: (getImages(item.product.images)[0] as string | undefined) ?? '',
    }));

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error('[wishlist] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { productId } = await request.json();
    const [item] = await db
      .insert(schema.wishlistItem)
      .values({ id: crypto.randomUUID(), userId: user.id, productId })
      .returning();

    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    console.error('[wishlist] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const productId = body.productId ?? searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    await db
      .delete(schema.wishlistItem)
      .where(
        and(
          eq(schema.wishlistItem.userId, user.id),
          eq(schema.wishlistItem.productId, productId)
        )
      );

    return NextResponse.json({ message: 'Removed' });
  } catch (error: unknown) {
    console.error('[wishlist] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
