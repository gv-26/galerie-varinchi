export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, ne, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { parseProduct, getImages } from '@/lib/product-utils';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await getCurrentUser();
    const includeInactive = searchParams.get('includeInactive') === 'true' && user?.isAdmin;

    const list = await db.query.product.findMany({
      where: includeInactive
        ? ne(schema.product.status, 'deleted')
        : eq(schema.product.status, 'active'),
      orderBy: [desc(schema.product.createdAt)],
      with: { subCategory: { with: { category: true } }, artistProfile: true },
    });

    return NextResponse.json({ products: list.map(parseProduct) });
  } catch (error: unknown) {
    console.error('[products] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { requestId, ...productData } = await request.json();

    const [product] = await db
      .insert(schema.product)
      .values({
        ...productData,
        id: crypto.randomUUID(),
        status: 'active',
        basePrice: productData.price ?? productData.basePrice ?? 0,
        image:
          productData.image ??
          (getImages(productData.images)?.[0] as string | undefined) ??
          '/images/placeholder.jpg',
        artistProfileId: productData.artistProfileId ?? null,
      })
      .returning();

    if (requestId) {
      await db
        .update(schema.artRequest)
        .set({ status: 'APPROVED' })
        .where(eq(schema.artRequest.id, requestId));
    }

    revalidatePath('/admin/content/products');
    revalidatePath('/category', 'layout');
    revalidatePath('/');

    return NextResponse.json({ product: parseProduct(product) }, { status: 201 });
  } catch (error: unknown) {
    console.error('[products] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
