export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createToken, hashPassword } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';
import crypto from 'crypto';

/**
 * Artist signup OTP flow.
 *
 * POST without `otp` → send verification code.
 * POST with `otp`    → verify code and create/sign-in user.
 */
export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, otp, password, isSignup } = await request.json();
    const email = rawEmail?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Step 1 — send OTP
    if (!otp) {
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

    // Step 2 — verify OTP
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

    let user = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
    const isAdminEmail = email === 'admin@galerievarinchi.com';

    if (!user && isSignup) {
      const passwordHash = password ? await hashPassword(password) : null;
      [user] = await db
        .insert(schema.user)
        .values({ id: crypto.randomUUID(), email, passwordHash, isAdmin: isAdminEmail })
        .returning();
    } else if (user && isAdminEmail && !user.isAdmin) {
      [user] = await db
        .update(schema.user)
        .set({ isAdmin: true })
        .where(eq(schema.user.id, user.id))
        .returning();
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found. Please sign up.' }, { status: 404 });
    }

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
    console.error('[auth/verify-otp] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
