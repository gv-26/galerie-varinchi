export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { subCategory as subCategorySchema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { name, displayOrder } = await request.json();

  const [sub] = await db.update(subCategorySchema)
    .set({ name, displayOrder })
    .where(eq(subCategorySchema.id, id))
    .returning();
    
  return NextResponse.json(sub);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await db.delete(subCategorySchema).where(eq(subCategorySchema.id, id));
  
  return NextResponse.json({ success: true });
}
