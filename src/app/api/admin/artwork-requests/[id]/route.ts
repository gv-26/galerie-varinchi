export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { getImages } from '@/lib/product-utils';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const req = await db.query.artRequest.findFirst({
      where: eq(schema.artRequest.id, id),
      with: { artistProfile: true, category: true, subCategory: true },
    });

    if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ request: req });
  } catch (error: unknown) {
    console.error('[admin/artwork-requests/[id]] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const { action } = await request.json();

    const [artReq] = await db
      .update(schema.artRequest)
      .set({ status: action === 'APPROVE' ? 'APPROVED' : 'DECLINED' })
      .where(eq(schema.artRequest.id, id))
      .returning();

    if (action === 'APPROVE') {
      const imageUrls = getImages(artReq.images);
      await db.insert(schema.product).values({
        id: crypto.randomUUID(),
        title: artReq.title,
        description: artReq.description,
        basePrice: artReq.price,
        image: (imageUrls[0] as string | undefined) ?? '/images/placeholder.jpg',
        images: artReq.images,
        specifications: artReq.specifications,
        unitsAvailable: artReq.quantity,
        status: 'active',
        subCategoryId: artReq.subCategoryId,
        artistProfileId: artReq.artistId,
      });

      revalidatePath('/admin/content/products');
      revalidatePath('/category', 'layout');
      revalidatePath('/');
    }

    return NextResponse.json({ artReq });
  } catch (error: unknown) {
    console.error('[admin/artwork-requests/[id]] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
