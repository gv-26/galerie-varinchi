export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { category as categorySchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

// PUT update a category
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { name, displayOrder } = await request.json();

  const [category] = await db.update(categorySchema)
    .set({ name, displayOrder })
    .where(eq(categorySchema.id, id))
    .returning();

  return NextResponse.json(category);
}

// DELETE a category
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await db.delete(categorySchema).where(eq(categorySchema.id, id));
  
  return NextResponse.json({ success: true });
}
