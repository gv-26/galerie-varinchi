export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { sendArtistApplicationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const {
      fullName, email, phone, country, state, area, bio, specialization, portfolioLink,
      examples, profilePhotoUrl, agreementIp, agreementVersion, agreementTimestamp, agreementPdfUrl,
    } = await request.json();

    const ipAddress =
      agreementIp ??
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      'unknown';

    const [profile] = await db
      .insert(schema.artistProfile)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        fullName,
        email,
        phone,
        country,
        state,
        area,
        bio,
        specialization,
        portfolioLink,
        examples: JSON.stringify(examples ?? []),
        profilePhoto: profilePhotoUrl ?? null,
        ipAddress,
        agreementPdfUrl: agreementPdfUrl ?? null,
        agreementVersion: agreementVersion ?? '1.0',
        agreementTimestamp: agreementTimestamp ?? new Date().toISOString(),
        status: 'PENDING',
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.artistProfile.userId,
        set: {
          fullName, phone, country, state, area, bio, specialization, portfolioLink,
          examples: JSON.stringify(examples ?? []),
          profilePhoto: profilePhotoUrl ?? null,
          ipAddress,
          agreementPdfUrl,
          agreementVersion,
          agreementTimestamp,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();

    // Fire-and-forget — do not await so it doesn't block the response
    sendArtistApplicationEmail(fullName, email).catch((err) =>
      console.error('[artist/apply] Admin notification email failed:', err)
    );

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error: unknown) {
    console.error('[artist/apply] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
