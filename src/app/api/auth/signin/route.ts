export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { user, otpToken } from '@/db/schema';
import { generateOtp, getOtpExpiryDate } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const existingUser = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.email, email)
    });
    if (!existingUser) {
      return NextResponse.json({ error: 'No account found. Please sign up first.' }, { status: 400 });
    }

    const otp = generateOtp();
    await db.insert(otpToken).values({
      id: crypto.randomUUID(),
      email,
      otp,
      expiresAt: getOtpExpiryDate().toISOString(),
    });

    await sendOtpEmail(email, otp);

    return NextResponse.json({ message: 'OTP sent to your email', email });
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
