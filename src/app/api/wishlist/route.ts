export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { wishlistItem as wishlistItemSchema } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const items = await db.query.wishlistItem.findMany({
      where: eq(wishlistItemSchema.userId, user.id),
      with: { product: true },
    });

    return NextResponse.json({
      items: items.map(item => ({
        id: item.id,
        productId: item.productId,
        title: item.product.title,
        image: item.product.image,
      })),
    });
  } catch (error) {
    console.error('Wishlist GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { productId } = await request.json();

    const existing = await db.query.wishlistItem.findFirst({
      where: and(eq(wishlistItemSchema.userId, user.id), eq(wishlistItemSchema.productId, productId))
    });

    if (existing) {
      return NextResponse.json({ message: 'Already in wishlist' });
    }

    await db.insert(wishlistItemSchema).values({
      id: crypto.randomUUID(),
      userId: user.id,
      productId,
    });

    return NextResponse.json({ message: 'Added to wishlist' }, { status: 201 });
  } catch (error) {
    console.error('Wishlist POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { productId } = await request.json();

    await db.delete(wishlistItemSchema).where(
      and(eq(wishlistItemSchema.userId, user.id), eq(wishlistItemSchema.productId, productId))
    );

    return NextResponse.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Wishlist DELETE error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
