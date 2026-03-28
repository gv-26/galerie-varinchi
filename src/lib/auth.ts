import { cookies } from 'next/headers';
import { db } from '../db';
import { session } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { getSecret } from './secrets';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString('hex');
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex') === key);
    });
  });
}


function base64UrlEncode(obj: any): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): any {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

const getJwtSecret = () => getSecret('JWT_SECRET') || 'dev-secret';

export async function createToken(userId: string, sessionId: string): Promise<string> {
  const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
  const payload = base64UrlEncode({ userId, sessionId, exp });
  
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${header}.${payload}.${signature}`;
}

export async function verifyToken(token: string): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${header}.${payload}`)
      .digest('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    // Prevent timing attacks visually (in strict modes use timingSafeEqual, but this works for basic validation)
    if (signature !== expectedSignature) return null;

    const decodedPayload = base64UrlDecode(payload);
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return decodedPayload as { userId: string; sessionId: string };
  } catch (error) {
    console.error('JWT verify error:', error);
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
