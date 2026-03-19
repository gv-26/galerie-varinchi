export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { order as orderSchema, orderItem as orderItemSchema, product as productSchema, cartItem as cartItemSchema } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
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

    const conditions: any = user.isAdmin
      ? status ? eq(orderSchema.status, status) : undefined
      : eq(orderSchema.userId, user.id);

    const [orders, countResult] = await Promise.all([
      db.query.order.findMany({
        where: conditions,
        with: {
          orderItems: { with: { product: true } },
          user: true,
        },
        orderBy: [desc(orderSchema.createdAt)],
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(orderSchema).where(conditions)
    ]);

    // Map `orderItems` to `items` for frontend consistency
    const consistentOrders = orders.map(o => ({ ...o, items: o.orderItems }));

    return NextResponse.json({ orders: consistentOrders, total: Number(countResult[0]?.count || 0) });
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

    const orderId = crypto.randomUUID();
    const [order] = await db.insert(orderSchema).values({
      id: orderId,
      userId: user.id,
      totalAmount,
      transactionId: transactionId || `TXN_${Date.now()}`,
      customerName: user.name || '',
      customerEmail: user.email,
      customerPhone: user.phone || '',
      customerAddress: user.address || '',
    }).returning();

    await db.insert(orderItemSchema).values(
      items.map((item: any) => ({
        id: crypto.randomUUID(),
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        medium: item.medium || null,
        frameType: item.frameType || null,
        frameColor: item.frameColor || null,
        selectedOptions: item.selectedOptions || null,
        price: item.price,
      }))
    );

    // Decrement units and fetch complete returned item map
    const orderItems = await db.query.orderItem.findMany({
      where: eq(orderItemSchema.orderId, orderId)
    });

    for (const item of items) {
      const product = await db.query.product.findFirst({ where: eq(productSchema.id, item.productId) });
      if (product && product.unitsAvailable !== null) {
        await db.update(productSchema)
          .set({ unitsAvailable: Math.max(0, product.unitsAvailable - item.quantity) })
          .where(eq(productSchema.id, item.productId));
      }
    }

    // Clear cart
    await db.delete(cartItemSchema).where(eq(cartItemSchema.userId, user.id));

    // Send order confirmation
    await sendOrderConfirmationEmail(user.email, order.id, totalAmount);

    return NextResponse.json({ order: { ...order, items: orderItems } }, { status: 201 });
  } catch (error) {
    console.error('Orders POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
