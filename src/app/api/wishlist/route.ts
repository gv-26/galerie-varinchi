import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      include: { product: true },
    });

    return NextResponse.json({
      items: items.map(item => ({
        id: item.id,
        productId: item.productId,
        title: item.product.title,
        image: item.product.image,
      })),
    });
  } catch (error) {
    console.error('Wishlist GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { productId } = await request.json();

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: user.id, productId } },
    });

    if (existing) {
      return NextResponse.json({ message: 'Already in wishlist' });
    }

    await prisma.wishlistItem.create({
      data: { userId: user.id, productId },
    });

    return NextResponse.json({ message: 'Added to wishlist' }, { status: 201 });
  } catch (error) {
    console.error('Wishlist POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { productId } = await request.json();

    await prisma.wishlistItem.deleteMany({
      where: { userId: user.id, productId },
    });

    return NextResponse.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Wishlist DELETE error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
