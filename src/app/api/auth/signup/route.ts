export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createToken, hashPassword } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, password, otp } = await request.json();
    const email = rawEmail?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Step 1 — send OTP
    if (!otp) {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'Email and password (min 6 chars) are required' },
          { status: 400 }
        );
      }

      const existing = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
      if (existing) {
        return NextResponse.json(
          { error: 'Account already exists. Please sign in instead.' },
          { status: 400 }
        );
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
      return NextResponse.json({ message: 'OTP sent' });
    }

    // Step 2 — verify OTP and create account
    const record = await db.query.otpToken.findFirst({
      where: eq(schema.otpToken.email, email),
      orderBy: [desc(schema.otpToken.createdAt)],
    });

    if (
      !record ||
      record.otp !== otp.trim() ||
      record.used ||
      new Date(record.expiresAt).getTime() < Date.now()
    ) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    const isAdmin = email === 'admin@galerievarinchi.com';
    const passwordHash = password ? await hashPassword(password) : null;

    const [user] = await db
      .insert(schema.user)
      .values({ id: crypto.randomUUID(), email, passwordHash, isAdmin })
      .returning();

    await db.update(schema.otpToken).set({ used: true }).where(eq(schema.otpToken.id, record.id));

    const sessionId = crypto.randomUUID();
    const token = await createToken(user.id, sessionId);

    await db.insert(schema.session).values({
      id: sessionId,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 604800 * 1000).toISOString(),
    });

    const res = NextResponse.json({ user });
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 604800,
      path: '/',
    });

    return res;
  } catch (error: unknown) {
    console.error('[auth/signup] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
