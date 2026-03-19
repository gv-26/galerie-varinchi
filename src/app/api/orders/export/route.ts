export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'NEW';

    const orders = await prisma.order.findMany({
      where: { status },
      include: {
        items: { include: { product: { include: { subCategory: { include: { category: true } } } } } },
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = orders.flatMap(order =>
      order.items.map(item => ({
        'Order ID': order.id,
        'Date': order.createdAt.toISOString().split('T')[0],
        'Time': order.createdAt.toISOString().split('T')[1].substring(0, 8),
        'Product': item.product.title,
        'Category': item.product.subCategory?.category?.name || '',
        'Sub-Category': item.product.subCategory?.name || '',
        'Medium': item.medium || 'N/A',
        'Frame Type': item.frameType || 'N/A',
        'Frame Color': item.frameColor || 'N/A',
        'Quantity': item.quantity,
        'Customer Name': order.customerName || '',
        'Email': order.customerEmail,
        'Phone': order.customerPhone || '',
        'Address': (order.customerAddress || '').replace(/[\n\r,]/g, ' '),
        'Amount Paid': `₹${order.totalAmount}`,
        'Transaction ID': order.transactionId || '',
        'Status': order.status,
      }))
    );

    if (rows.length === 0) {
      return new NextResponse('No orders found', { status: 404 });
    }

    // Generate CSV String (100% Edge Compatible)
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','), // Header row
      ...rows.map(row => 
        headers.map(header => `"${String(row[header as keyof typeof row]).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders_${status.toLowerCase()}_${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new NextResponse('Something went wrong', { status: 500 });
  }
}
