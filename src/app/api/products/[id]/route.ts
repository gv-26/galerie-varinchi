export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { parseProduct } from '@/lib/product-utils';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = await db.query.product.findFirst({
      where: eq(schema.product.id, id),
      with: { subCategory: { with: { category: true } }, artistProfile: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product: parseProduct(product) });
  } catch (error: unknown) {
    console.error('[products/[id]] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const [product] = await db
      .update(schema.product)
      .set(body)
      .where(eq(schema.product.id, id))
      .returning();

    revalidatePath('/admin/content/products');
    revalidatePath('/category', 'layout');
    revalidatePath('/');

    return NextResponse.json({ product: parseProduct(product) });
  } catch (error: unknown) {
    console.error('[products/[id]] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const [product] = await db
      .update(schema.product)
      .set(body)
      .where(eq(schema.product.id, id))
      .returning();

    revalidatePath('/admin/content/products');
    revalidatePath('/category', 'layout');
    revalidatePath('/');

    return NextResponse.json({ product: parseProduct(product) });
  } catch (error: unknown) {
    console.error('[products/[id]] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await db.delete(schema.product).where(eq(schema.product.id, id));

    revalidatePath('/admin/content/products');
    revalidatePath('/');

    return NextResponse.json({ message: 'Product deleted' });
  } catch (error: unknown) {
    console.error('[products/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
