export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const subCategory = await prisma.subCategory.create({
      data: { name, slug, categoryId, displayOrder: displayOrder ?? 0 },
    });

    return NextResponse.json(subCategory, { status: 201 });
  } catch (error) {
    console.error('Create subcategory error:', error);
    return NextResponse.json({ error: 'Slug must be unique within the category' }, { status: 500 });
  }
}
