export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { processCommissionForOrder } from '@/lib/commission';
import { createShiprocketOrder, assignAWB, schedulePickup } from '@/lib/shiprocket';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

    const isAdminRequest = user.isAdmin && !searchParams.has('mine');
    const whereClause = isAdminRequest
      ? status ? eq(schema.order.status, status) : undefined
      : eq(schema.order.userId, user.id);

    const orders = await db.query.order.findMany({
      where: whereClause,
      orderBy: [desc(schema.order.createdAt)],
      limit,
      with: { orderItems: { with: { product: true } } },
    });

    return NextResponse.json({ orders });
  } catch (error: unknown) {
    console.error('[orders] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();

    // Verify stock for all items in a single pass
    const productIds: string[] = body.items.map((i: { productId: string }) => i.productId);
    const products = await db.query.product.findMany({
      where: inArray(schema.product.id, productIds),
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of body.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      if (product.unitsAvailable !== null && product.unitsAvailable < item.quantity) {
        return NextResponse.json(
          { error: `Not enough stock for ${product.title}. Only ${product.unitsAvailable} left.` },
          { status: 400 }
        );
      }
    }

    // Coupon discount
    let couponId: string | null = null;
    let discountAmount: number | null = null;
    let subtotal: number = body.items.reduce(
      (sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity,
      0
    );

    if (body.couponCode) {
      const coupon = await db.query.coupon.findFirst({
        where: eq(schema.coupon.code, body.couponCode.toUpperCase().trim()),
      });
      if (coupon?.isActive && (!coupon.expiresAt || new Date(coupon.expiresAt).getTime() > Date.now())) {
        couponId = coupon.id;
        discountAmount = Math.round(subtotal * (coupon.discountPercent / 100) * 100) / 100;
        subtotal -= discountAmount;
      }
    }

    // Create order
    const [order] = await db
      .insert(schema.order)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        status: 'NEW',
        totalAmount: subtotal,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        customerAddress: user.address,
        couponId,
        discountAmount,
      })
      .returning();

    await db.insert(schema.orderItem).values(
      body.items.map((i: { productId: string; quantity: number; price: number; medium?: string; frameType?: string; frameColor?: string }) => ({
        id: crypto.randomUUID(),
        orderId: order.id,
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
        medium: i.medium,
        frameType: i.frameType,
        frameColor: i.frameColor,
      }))
    );

    // Decrement stock
    for (const item of body.items) {
      const product = productMap.get(item.productId);
      if (product?.unitsAvailable !== null && product?.unitsAvailable !== undefined) {
        const newUnits = product.unitsAvailable - item.quantity;
        await db
          .update(schema.product)
          .set({
            unitsAvailable: Math.max(0, newUnits),
            status: newUnits <= 0 ? 'inactive' : product.status,
          })
          .where(eq(schema.product.id, item.productId));
      }
    }

    // Order confirmation email
    await sendOrderConfirmationEmail(user.email, order.id, order.totalAmount);

    // Commission processing (non-blocking)
    processCommissionForOrder(order.id).catch((err) =>
      console.error('[orders] Commission processing error:', { orderId: order.id, error: err })
    );

    // Shiprocket logistics (non-blocking)
    (async () => {
      try {
        const srItems = body.items.map((item: { productId: string; quantity: number; price: number }) => {
          const product = productMap.get(item.productId)!;
          return {
            name: product.title,
            sku: product.id.substring(0, 8),
            units: item.quantity,
            selling_price: item.price,
            weight: product.weight ?? 0.5,
            length: product.length ?? 10,
            width: product.width ?? 10,
            height: product.height ?? 10,
          };
        });

        const srOrder = await createShiprocketOrder({
          orderId: order.id,
          orderDate: new Date().toISOString(),
          customerName: user.name ?? 'Customer',
          customerEmail: user.email,
          customerPhone: user.phone ?? '9999999999',
          customerAddress: user.address ?? 'India',
          subTotal: subtotal,
          items: srItems,
        });

        const awbData = await assignAWB(srOrder.shipmentId);
        if (awbData) {
          await schedulePickup(srOrder.shipmentId);
        }

        await db
          .update(schema.order)
          .set({
            shiprocketOrderId: srOrder.shiprocketOrderId,
            shiprocketShipmentId: srOrder.shipmentId,
            awbNumber: awbData?.awbNumber ?? null,
            courierName: awbData?.courierName ?? null,
            courierId: awbData?.courierId ?? null,
            shippingStatus: awbData?.awbNumber ? 'LABEL_GENERATED' : 'PENDING',
          })
          .where(eq(schema.order.id, order.id));
      } catch (err) {
        console.error('[orders] Shiprocket error:', { orderId: order.id, error: err });
      }
    })();

    return NextResponse.json({ order }, { status: 201 });
  } catch (error: unknown) {
    console.error('[orders] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
