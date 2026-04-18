export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ message: 'Signed out' });
  res.cookies.set('auth-token', '', { maxAge: 0, path: '/' });
  return res;
}
