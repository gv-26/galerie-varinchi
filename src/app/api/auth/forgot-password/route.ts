export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendOtpEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail } = await request.json();
    const email = rawEmail?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 600_000).toISOString();

    await db
      .insert(schema.otpToken)
      .values({ id: crypto.randomUUID(), email, otp: code, expiresAt })
      .onConflictDoUpdate({
        target: schema.otpToken.email,
        set: { otp: code, used: false, expiresAt },
      });

    await sendOtpEmail(email, code);
    return NextResponse.json({ message: 'OTP sent to your email' });
  } catch (error: unknown) {
    console.error('[auth/forgot-password] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
