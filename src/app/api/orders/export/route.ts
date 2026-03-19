export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
        'Address': order.customerAddress || '',
        'Amount Paid': `₹${order.totalAmount}`,
        'Transaction ID': order.transactionId || '',
        'Status': order.status,
      }))
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="orders_${status.toLowerCase()}_${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
