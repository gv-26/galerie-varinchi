export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { createToken, getCurrentUser } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';

export async function GET(request: NextRequest, { params }: { params: Promise<{ action?: string[] }> }) {
  try {
    const { action = [] } = await params;
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (action[0] === 'auth' && action[1] === 'me') return NextResponse.json({ user: user || null });

    if (action[0] === 'products') {
      const pId = id || action[1];
      if (pId) {
        const p = await db.query.product.findFirst({ where: eq(schema.product.id, pId), with: { subCategory: { with: { category: true } } } });
        return p ? NextResponse.json({ product: p }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const list = await db.query.product.findMany({ orderBy: [desc(schema.product.createdAt)], with: { subCategory: { with: { category: true } } } });
      return NextResponse.json({ products: list });
    }

    if (action[0] === 'categories') {
      const list = await db.query.category.findMany({ with: { subCategories: true } });
      return NextResponse.json(list);
    }

    if (action[0] === 'wishlist' && user) {
      const list = await db.query.wishlistItem.findMany({ where: eq(schema.wishlistItem.userId, user.id), with: { product: true } });
      return NextResponse.json({ wishlist: list });
    }

    if (action[0] === 'admin' && user?.isAdmin) {
      if (action[1] === 'artists') {
        if (action[2] === 'stats') {
          const [pA, aA, pW] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(schema.artistProfile).where(eq(schema.artistProfile.status, 'PENDING')),
            db.select({ count: sql<number>`count(*)` }).from(schema.artistProfile).where(eq(schema.artistProfile.status, 'APPROVED')),
            db.select({ count: sql<number>`count(*)` }).from(schema.artRequest).where(eq(schema.artRequest.status, 'PENDING'))
          ]);
          return NextResponse.json({ pendingArtists: Number(pA[0].count), approvedArtists: Number(aA[0].count), pendingArtworks: Number(pW[0].count) });
        }
        const requests = await db.query.artistProfile.findMany({ where: eq(schema.artistProfile.status, 'PENDING') });
        return NextResponse.json({ requests });
      }
      if (action[1] === 'artwork-requests') {
        const list = await db.query.artRequest.findMany({ with: { artistProfile: true } });
        return NextResponse.json({ requests: list });
      }
    }

    if (action[0] === 'artist' && user) {
       const profile = await db.query.artistProfile.findFirst({ where: eq(schema.artistProfile.userId, user.id) });
       if (action[1] === 'profile') return NextResponse.json({ profile });
       if (action[1] === 'art-requests' && profile) {
         const requests = await db.query.artRequest.findMany({ where: eq(schema.artRequest.artistId, profile.id) });
         return NextResponse.json({ requests });
       }
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ action?: string[] }> }) {
  try {
    const { action = [] } = await params;
    const user = await getCurrentUser();
    const body = await request.json();

    if (action[0] === 'auth') {
      const { email, otp } = body;
      if (action[1] === 'signin' || action[1] === 'signup' || action[1] === 'otp') {
        if (!otp) {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          await db.insert(schema.otpToken).values({ id: crypto.randomUUID(), email, otp: code, expiresAt: new Date(Date.now() + 600000).toISOString() }).onConflictDoUpdate({ target: schema.otpToken.email, set: { otp: code, used: false } });
          await sendOtpEmail(email, code);
          return NextResponse.json({ message: 'Sent' });
        }
        const record = await db.query.otpToken.findFirst({ where: and(eq(schema.otpToken.email, email), eq(schema.otpToken.otp, otp)) });
        if (!record || record.used) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
        await db.update(schema.otpToken).set({ used: true }).where(eq(schema.otpToken.id, record.id));
        let u = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
        if (!u && action[1] === 'signup') [u] = await db.insert(schema.user).values({ id: crypto.randomUUID(), email, isAdmin: false }).returning();
        if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const token = await createToken(u.id, crypto.randomUUID());
        const res = NextResponse.json({ user: u });
        res.cookies.set('auth-token', token, { httpOnly: true, secure: true, maxAge: 604800 });
        return res;
      }
      if (action[1] === 'logout' || action[1] === 'signout') {
        const res = NextResponse.json({ message: 'Out' });
        res.cookies.set('auth-token', '', { maxAge: 0 });
        return res;
      }
    }

    if (action[0] === 'products' && user?.isAdmin) {
      const [product] = await db.insert(schema.product).values({ ...body, id: crypto.randomUUID(), status: 'active' }).returning();
      return NextResponse.json({ product }, { status: 201 });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ action?: string[] }> }) {
  try {
    const { action = [] } = await params;
    const user = await getCurrentUser();
    const body = await request.json();
    if (action[0] === 'products' && user?.isAdmin) {
      const id = new URL(request.url).searchParams.get('id') || action[1];
      const [product] = await db.update(schema.product).set({ status: body.status }).where(eq(schema.product.id, id)).returning();
      return NextResponse.json({ product });
    }
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ action?: string[] }> }) {
  try {
     const { action = [] } = await params;
     const user = await getCurrentUser();
     const body = await request.json();
     if (action[0] === 'products' && user?.isAdmin) {
       const id = new URL(request.url).searchParams.get('id') || action[1];
       const [prod] = await db.update(schema.product).set(body).where(eq(schema.product.id, id)).returning();
       return NextResponse.json({ product: prod });
     }
     return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ action?: string[] }> }) {
  try {
    const { action = [] } = await params;
    const user = await getCurrentUser();
    if (action[0] === 'wishlist' && user) {
      const id = new URL(request.url).searchParams.get('id') || action[1];
      await db.delete(schema.wishlistItem).where(and(eq(schema.wishlistItem.userId, user.id), eq(schema.wishlistItem.productId, id)));
      return NextResponse.json({ message: 'Removed' });
    }
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}
