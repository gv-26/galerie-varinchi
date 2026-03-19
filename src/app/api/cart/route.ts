export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const items = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: { product: true },
    });

    return NextResponse.json({
      items: items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        title: item.product.title,
        image: item.product.image,
        quantity: item.quantity,
        medium: item.medium,
        frameType: item.frameType,
        frameColor: item.frameColor,
        selectedOptions: item.selectedOptions || undefined,
        price: item.price,
      })),
    });
  } catch (error) {
    console.error('Cart GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const item = await prisma.cartItem.create({
      data: {
        userId: user.id,
        productId: body.productId,
        quantity: body.quantity || 1,
        medium: body.medium || null,
        frameType: body.frameType || null,
        frameColor: body.frameColor || null,
        selectedOptions: body.selectedOptions || null,
        price: body.price,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Cart POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, quantity } = await request.json();
    await prisma.cartItem.update({
      where: { id, userId: user.id },
      data: { quantity },
    });

    return NextResponse.json({ message: 'Updated' });
  } catch (error) {
    console.error('Cart PUT error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    if (body.clearAll) {
      await prisma.cartItem.deleteMany({ where: { userId: user.id } });
    } else {
      await prisma.cartItem.delete({
        where: { id: body.id, userId: user.id },
      });
    }

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Cart DELETE error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
