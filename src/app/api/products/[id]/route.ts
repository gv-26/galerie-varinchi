export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { product as productSchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await db.query.product.findFirst({
      where: eq(productSchema.id, id),
      with: { subCategory: { with: { category: true } } },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        ...product,
        mediums: JSON.parse(product.mediums),
        frameTypes: JSON.parse(product.frameTypes),
        frameColors: JSON.parse(product.frameColors),
        specifications: JSON.parse(product.specifications || '[]'),
        priceModifiers: JSON.parse(product.priceModifiers),
      },
    });
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!['active', 'inactive', 'deleted'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const [product] = await db.update(productSchema)
      .set({ status })
      .where(eq(productSchema.id, id))
      .returning();

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Product PATCH error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const [product] = await db.update(productSchema)
      .set({
        title: body.title,
        description: body.description,
        image: body.image,
        images: body.images || "[]",
        subCategoryId: body.subCategoryId,
        mediums: JSON.stringify(body.mediums || []),
        frameTypes: JSON.stringify(body.frameTypes || []),
        frameColors: JSON.stringify(body.frameColors || []),
        specifications: JSON.stringify(body.specifications || []),
        basePrice: body.basePrice,
        priceModifiers: JSON.stringify(body.priceModifiers || {}),
        unitsAvailable: body.unitsAvailable !== undefined ? body.unitsAvailable : null,
      })
      .where(eq(productSchema.id, id))
      .returning();

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Product PUT error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
