export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { subCategory as subCategorySchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

// POST create a subcategory (admin only)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, slug, categoryId, displayOrder } = await request.json();

    if (!name || !slug || !categoryId) {
      return NextResponse.json({ error: 'Name, slug and categoryId are required' }, { status: 400 });
    }

    const [sub] = await db.insert(subCategorySchema).values({
      id: crypto.randomUUID(),
      name,
      slug,
      categoryId,
      displayOrder: displayOrder ?? 0,
    }).returning();

    return NextResponse.json(sub, { status: 201 });
  } catch (error) {
    console.error('Create subcategory error:', error);
    return NextResponse.json({ error: 'Slug must be unique within the category' }, { status: 500 });
  }
}
