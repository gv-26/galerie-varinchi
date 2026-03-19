export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOtp, getOtpExpiryDate } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      return NextResponse.json({ error: 'No account found. Please sign up first.' }, { status: 400 });
    }

    const otp = generateOtp();
    await prisma.otpToken.create({
      data: {
        email,
        otp,
        expiresAt: getOtpExpiryDate(),
      },
    });

    await sendOtpEmail(email, otp);

    return NextResponse.json({ message: 'OTP sent to your email', email });
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
