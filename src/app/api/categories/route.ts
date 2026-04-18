export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function GET() {
  try {
    const categories = await db.query.category.findMany({
      with: { subCategories: true },
    });
    return NextResponse.json(categories);
  } catch (error: unknown) {
    console.error('[categories] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, slug } = await request.json();

    const existing = await db.query.category.findFirst({
      where: eq(schema.category.slug, slug),
    });

    if (existing) {
      return NextResponse.json(
        { error: `Category with slug "${slug}" already exists.` },
        { status: 400 }
      );
    }

    const [category] = await db
      .insert(schema.category)
      .values({ id: crypto.randomUUID(), name, slug })
      .returning();

    revalidatePath('/admin/content/categories');
    revalidatePath('/category', 'layout');
    revalidatePath('/');

    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    console.error('[categories] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
