import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '../db';
import { session } from '../db/schema';
import { eq } from 'drizzle-orm';

const getSecret = () => new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret'
);

export async function createToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ userId, sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { userId: string; sessionId: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const sessionData = await db.query.session.findFirst({
    where: eq(session.id, payload.sessionId),
    with: { user: true },
  });

  if (!sessionData || new Date(sessionData.expiresAt) < new Date()) {
    return null;
  }

  return sessionData.user;
}
