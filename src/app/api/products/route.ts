export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { product as productSchema, category as categorySchema, artRequest as artRequestSchema } from '@/db/schema';
import { eq, inArray, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subCategoryId = searchParams.get('subCategoryId');
    const categorySlug = searchParams.get('categorySlug');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const conditions: any[] = [];
    if (includeInactive) {
      conditions.push(inArray(productSchema.status, ['active', 'inactive']));
    } else {
      conditions.push(eq(productSchema.status, 'active'));
    }

    if (subCategoryId) {
      conditions.push(eq(productSchema.subCategoryId, subCategoryId));
    } else if (categorySlug) {
      const category = await db.query.category.findFirst({
        where: eq(categorySchema.slug, categorySlug),
        with: { subCategories: true },
      });
      if (category && category.subCategories.length > 0) {
        conditions.push(inArray(productSchema.subCategoryId, category.subCategories.map(s => s.id)));
      }
    }

    const products = await db.query.product.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(productSchema.createdAt)],
      with: { subCategory: { with: { category: true } } },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const [product] = await db.insert(productSchema).values({
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description,
      image: body.image,
      images: body.images || "[]",
      subCategoryId: body.subCategoryId,
      status: 'active',
      mediums: JSON.stringify(body.mediums || []),
      frameTypes: JSON.stringify(body.frameTypes || []),
      frameColors: JSON.stringify(body.frameColors || []),
      specifications: JSON.stringify(body.specifications || []),
      basePrice: body.basePrice,
      priceModifiers: JSON.stringify(body.priceModifiers || {}),
      unitsAvailable: body.unitsAvailable || null,
    }).returning();

    if (body.requestId) {
      await db.update(artRequestSchema)
        .set({ status: 'APPROVED' })
        .where(eq(artRequestSchema.id, body.requestId));
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
