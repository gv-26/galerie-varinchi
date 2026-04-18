export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { sendArtworkSubmissionEmail } from '@/lib/email';
import crypto from 'crypto';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const profile = await db.query.artistProfile.findFirst({
      where: eq(schema.artistProfile.userId, user.id),
    });

    if (!profile) {
      return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 });
    }

    const requests = await db.query.artRequest.findMany({
      where: eq(schema.artRequest.artistId, profile.id),
      orderBy: [desc(schema.artRequest.createdAt)],
    });

    return NextResponse.json({ requests });
  } catch (error: unknown) {
    console.error('[artist/art-requests] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const profile = await db.query.artistProfile.findFirst({
      where: eq(schema.artistProfile.userId, user.id),
    });

    if (!profile) {
      return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 });
    }

    const { title, description, yearCreated, price, quantity, specifications, images, categoryId, subCategoryId } =
      await request.json();

    const [artReq] = await db
      .insert(schema.artRequest)
      .values({
        id: crypto.randomUUID(),
        artistId: profile.id,
        title,
        description,
        yearCreated,
        price: parseFloat(price),
        quantity: parseInt(quantity, 10) || 1,
        specifications: specifications ?? '[]',
        images: JSON.stringify(images ?? []),
        status: 'PENDING',
        categoryId,
        subCategoryId,
      })
      .returning();

    sendArtworkSubmissionEmail(profile.fullName, title).catch((err) =>
      console.error('[artist/art-requests] Admin notification email failed:', err)
    );

    return NextResponse.json({ artReq }, { status: 201 });
  } catch (error: unknown) {
    console.error('[artist/art-requests] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
