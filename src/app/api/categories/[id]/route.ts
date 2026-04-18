export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { name } = await request.json();

    const [category] = await db
      .update(schema.category)
      .set({ name })
      .where(eq(schema.category.id, id))
      .returning();

    revalidatePath('/admin/content/categories');
    revalidatePath('/category', 'layout');
    revalidatePath('/');

    return NextResponse.json(category);
  } catch (error: unknown) {
    console.error('[categories/[id]] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await db.delete(schema.category).where(eq(schema.category.id, id));

    revalidatePath('/admin/content/categories');
    revalidatePath('/category', 'layout');
    revalidatePath('/');

    return NextResponse.json({ message: 'Category deleted' });
  } catch (error: unknown) {
    console.error('[categories/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
