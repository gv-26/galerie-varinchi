export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { user as userSchema, session as sessionSchema, otpToken } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createToken } from '@/lib/auth';
import { isOtpExpired } from '@/lib/otp';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, otp, isSignup } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // Find the latest unused OTP for this email
    const otpRecord = await db.query.otpToken.findFirst({
      where: and(eq(otpToken.email, email), eq(otpToken.otp, otp), eq(otpToken.used, false)),
      orderBy: [desc(otpToken.createdAt)],
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    if (isOtpExpired(new Date(otpRecord.expiresAt))) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    // Mark OTP as used
    await db.update(otpToken).set({ used: true }).where(eq(otpToken.id, otpRecord.id));

    // Create or find user
    let user;
    if (isSignup) {
      const [newUser] = await db.insert(userSchema).values({
        id: crypto.randomUUID(),
        email
      }).returning();
      user = newUser;
    } else {
      user = await db.query.user.findFirst({ where: eq(userSchema.email, email) });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const [session] = await db.insert(sessionSchema).values({
      id: crypto.randomUUID(),
      userId: user.id,
      token: crypto.randomUUID(),
      expiresAt: expiresAt.toISOString(),
    }).returning();

    // Create JWT token
    const token = await createToken(user.id, session.id);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({
      message: 'Verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
