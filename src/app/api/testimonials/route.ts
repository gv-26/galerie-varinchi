export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

export async function GET() {
  try {
    const list = await db.query.testimonial.findMany({
      where: eq(schema.testimonial.isActive, true),
      with: {
        user: { columns: { name: true } },
        product: { columns: { title: true } },
      },
      orderBy: [desc(schema.testimonial.createdAt)],
    });
    return NextResponse.json(list);
  } catch (error: unknown) {
    console.error('[testimonials] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const [testimonial] = await db
      .insert(schema.testimonial)
      .values({ id: crypto.randomUUID(), userId: user.id, ...body })
      .returning();

    return NextResponse.json(testimonial, { status: 201 });
  } catch (error: unknown) {
    console.error('[testimonials] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
