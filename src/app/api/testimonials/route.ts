export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testimonial as testimonialSchema } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const testimonials = await db.query.testimonial.findMany({
      limit: 6,
      orderBy: [desc(testimonialSchema.createdAt)],
      with: {
        user: { columns: { name: true } },
        product: { columns: { title: true } },
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

    const [testimonial] = await db.insert(testimonialSchema).values({
      id: crypto.randomUUID(),
      userId: user.id,
      productId,
      text,
    }).returning();

    return NextResponse.json(testimonial, { status: 201 });
  } catch (error) {
    console.error('Testimonials POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
