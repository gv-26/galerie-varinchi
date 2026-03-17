import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET all categories with their subcategories
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      subCategories: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });
  return NextResponse.json(categories);
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

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name, slug, displayOrder: displayOrder ?? 0 },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
