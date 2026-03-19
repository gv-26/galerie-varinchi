export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    const otpRecord = await prisma.otpToken.findFirst({
      where: { email, otp, used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    if (isOtpExpired(otpRecord.expiresAt)) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.otpToken.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Create or find user
    let user;
    if (isSignup) {
      user = await prisma.user.create({
        data: { email },
      });
    } else {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: crypto.randomUUID(),
        expiresAt,
      },
    });

    // Create JWT and set cookie
    const token = createToken(user.id, session.id);
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return NextResponse.json({
      message: isSignup ? 'Account created successfully' : 'Signed in successfully',
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
