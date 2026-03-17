import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const testimonials = await prisma.testimonial.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        product: { select: { title: true } },
      },
    });

    return NextResponse.json(testimonials);
  } catch (error) {
    console.error('Testimonials GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, text } = body;

    if (!productId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        userId: user.id,
        productId,
        text,
      },
    });

    return NextResponse.json(testimonial, { status: 201 });
  } catch (error) {
    console.error('Testimonials POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
