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

    const list = await db.query.cartItem.findMany({
      where: eq(schema.cartItem.userId, user.id),
      with: { product: true },
    });

    const items = list.map((item) => ({
      ...item,
      title: item.product.title,
      image: (getImages(item.product.images)[0] as string | undefined) ?? '',
    }));

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error('[cart] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const [item] = await db
      .insert(schema.cartItem)
      .values({ id: crypto.randomUUID(), userId: user.id, ...body })
      .returning();

    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    console.error('[cart] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { id, quantity } = await request.json();

    const [item] = await db
      .update(schema.cartItem)
      .set({ quantity })
      .where(and(eq(schema.cartItem.id, id), eq(schema.cartItem.userId, user.id)))
      .returning();

    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error('[cart] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { id, clearAll } = await request.json().catch(() => ({}));

    if (clearAll) {
      await db.delete(schema.cartItem).where(eq(schema.cartItem.userId, user.id));
    } else {
      await db
        .delete(schema.cartItem)
        .where(and(eq(schema.cartItem.id, id), eq(schema.cartItem.userId, user.id)));
    }

    return NextResponse.json({ message: 'Removed' });
  } catch (error: unknown) {
    console.error('[cart] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
