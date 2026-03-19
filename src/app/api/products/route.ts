export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subCategoryId = searchParams.get('subCategoryId');
    const categorySlug = searchParams.get('categorySlug');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Build where clause
    const where: Record<string, unknown> = {
      status: includeInactive ? { in: ['active', 'inactive'] } : 'active',
    };

    if (subCategoryId) {
      where.subCategoryId = subCategoryId;
    } else if (categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
        include: { subCategories: true },
      });
      if (category) {
        where.subCategoryId = { in: category.subCategories.map((s) => s.id) };
      }
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { subCategory: { include: { category: true } } },
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
    const product = await prisma.product.create({
      data: {
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
      },
    });

    if (body.requestId) {
      await prisma.artRequest.update({
        where: { id: body.requestId },
        data: { status: 'APPROVED' },
      });
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
