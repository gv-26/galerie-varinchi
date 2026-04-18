import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    
    // Validate that it has the required fields
    if (!payload.awb) {
      return NextResponse.json({ message: 'Missing AWB' }, { status: 400 });
    }

    const currentStatus = payload.current_status; // "DELIVERED", "IN TRANSIT", "PICKED UP", "RTO", etc
    
    // Map status string to uppercase without spaces or just exact match
    const trackingUrl = payload.tracking_url;

    // Find the order that matches the AWB
    const order = await db.query.order.findFirst({
      where: eq(schema.order.awbNumber, payload.awb)
    });

    if (!order) {
      return NextResponse.json({ message: 'Order not found for AWB' }, { status: 404 });
    }

    // Update the shipping status
    await db.update(schema.order)
      .set({ 
        shippingStatus: currentStatus,
        trackingUrl: trackingUrl || order.trackingUrl
      })
      .where(eq(schema.order.id, order.id));
      
    // If we wanted to, we could trigger customer emails here.
    // e.g., if (currentStatus === 'DELIVERED') sendDeliveredEmail(order.customerEmail);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Shiprocket Webhook Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
