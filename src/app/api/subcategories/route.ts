export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, slug, categoryId } = await request.json();

    const existing = await db.query.subCategory.findFirst({
      where: and(
        eq(schema.subCategory.slug, slug),
        eq(schema.subCategory.categoryId, categoryId)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: `Sub-category slug "${slug}" already exists in this category.` },
        { status: 400 }
      );
    }

    const [subCategory] = await db
      .insert(schema.subCategory)
      .values({ id: crypto.randomUUID(), name, slug, categoryId })
      .returning();

    revalidatePath('/admin/content/subcategories');
    revalidatePath('/admin/content/products');
    revalidatePath('/category', 'layout');
    revalidatePath('/');

    return NextResponse.json(subCategory, { status: 201 });
  } catch (error: unknown) {
    console.error('[subcategories] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
