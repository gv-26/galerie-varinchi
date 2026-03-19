export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { category as categorySchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

// GET all categories with their subcategories
export async function GET() {
  const categoriesList = await db.query.category.findMany({
    orderBy: (c, { asc }) => [asc(c.displayOrder)],
    with: {
      subCategories: {
        orderBy: (s, { asc }) => [asc(s.displayOrder)],
      },
    },
  });
  return NextResponse.json(categoriesList);
}

// POST create a new category (admin only)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, slug, displayOrder } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const existing = await db.query.category.findFirst({ where: (c, { eq }) => eq(c.slug, slug) });
    if (existing) {
      return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 400 });
    }

    const [category] = await db.insert(categorySchema).values({
      id: crypto.randomUUID(),
      name,
      slug,
      displayOrder: displayOrder ?? 0,
    }).returning();

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
