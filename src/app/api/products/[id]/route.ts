export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { subCategory: { include: { category: true } } },
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

// PATCH — update product status (active / inactive / deleted)
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

    const product = await prisma.product.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Product PATCH error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
