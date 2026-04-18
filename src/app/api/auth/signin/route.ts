export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createToken, verifyPassword } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, password } = await request.json();
    const email = rawEmail?.trim().toLowerCase();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await db.query.user.findFirst({ where: eq(schema.user.email, email) });

    if (!user) {
      return NextResponse.json(
        { error: 'Account not found. Please sign up instead.' },
        { status: 404 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Password not set. Please use "Forgot Password" to set one.' },
        { status: 400 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

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
    console.error('[auth/signin] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
