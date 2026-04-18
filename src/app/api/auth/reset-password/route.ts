export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, otp, newPassword } = await request.json();
    const email = rawEmail?.trim().toLowerCase();

    if (!email || !otp?.trim() || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Email, OTP, and new password (min 6 chars) are required' },
        { status: 400 }
      );
    }

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

    const user = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const passwordHash = await hashPassword(newPassword);
    await db.update(schema.user).set({ passwordHash }).where(eq(schema.user.id, user.id));
    await db.update(schema.otpToken).set({ used: true }).where(eq(schema.otpToken.id, record.id));

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error: unknown) {
    console.error('[auth/reset-password] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
