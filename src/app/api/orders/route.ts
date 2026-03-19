export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sendOrderConfirmationEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = user.isAdmin
      ? status ? { status } : {}
      : { userId: user.id };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true } },
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ orders, total });
  } catch (error) {
    console.error('Orders GET error:', error);
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
    const { items, transactionId } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    const totalAmount = items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0
    );

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        totalAmount,
        transactionId: transactionId || `TXN_${Date.now()}`,
        customerName: user.name || '',
        customerEmail: user.email,
        customerPhone: user.phone || '',
        customerAddress: user.address || '',
        items: {
          create: items.map((item: {
            productId: string;
            quantity: number;
            medium?: string;
            frameType?: string;
            frameColor?: string;
            selectedOptions?: string;
            price: number;
          }) => ({
            productId: item.productId,
            quantity: item.quantity,
            medium: item.medium || null,
            frameType: item.frameType || null,
            frameColor: item.frameColor || null,
            selectedOptions: item.selectedOptions || null,
            price: item.price,
          })),
        },
      },
      include: { items: true },
    });

    // Decrement units for mixed media / handmade art
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product && product.unitsAvailable !== null) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { unitsAvailable: Math.max(0, product.unitsAvailable - item.quantity) },
        });
      }
    }

    // Clear cart
    await prisma.cartItem.deleteMany({ where: { userId: user.id } });

    // Send order confirmation
    await sendOrderConfirmationEmail(user.email, order.id, totalAmount);

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Orders POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
