/**
 * Commission calculation engine for Galerie Varinchi.
 *
 * Rules:
 * - Artist earns 33% of sale price until cumulative artistShare reaches basePrice.
 * - After basePrice is reached, artist earns 7% as perpetual royalty.
 * - Handles the overflow edge case where a sale straddles both tiers.
 *
 * This function is pure and has no DB dependencies — easy to unit-test
 * and reusable from both the manual PATCH endpoint and future Razorpay webhook.
 */

export type CommissionResult = {
  artistShare: number;
  commissionType: 'INITIAL_33' | 'ROYALTY_7' | 'MIXED';
  newTotalCommissionPaid: number;
};

export function calculateArtistPayout(
  salePrice: number,
  basePrice: number,
  currentTotalCommissionPaid: number
): CommissionResult {
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const remaining = basePrice - currentTotalCommissionPaid;

  // Pure royalty — base price already hit
  if (remaining <= 0) {
    const share = round2(salePrice * 0.07);
    return {
      artistShare: share,
      commissionType: 'ROYALTY_7',
      newTotalCommissionPaid: round2(currentTotalCommissionPaid + share),
    };
  }

  const initial33Share = round2(salePrice * 0.33);

  // Pure initial — won't exceed base price this sale
  if (initial33Share <= remaining) {
    return {
      artistShare: initial33Share,
      commissionType: 'INITIAL_33',
      newTotalCommissionPaid: round2(currentTotalCommissionPaid + initial33Share),
    };
  }

  // Overflow: split the sale across both tiers
  // The portion of salePrice that earns at 33% to exactly hit basePrice:
  // portiontAtInitial * 0.33 = remaining  →  portionAtInitial = remaining / 0.33
  const portionAtInitial = remaining / 0.33;
  const portionAtRoyalty = salePrice - portionAtInitial;

  const initialShare = remaining; // exactly fills the gap
  const royaltyShare = round2(portionAtRoyalty * 0.07);
  const totalShare = round2(initialShare + royaltyShare);

  return {
    artistShare: totalShare,
    commissionType: 'MIXED', // stored as INITIAL_33, but a note could be added
    newTotalCommissionPaid: round2(currentTotalCommissionPaid + totalShare),
  };
}

/**
 * processCommissionForOrder — called after an order is marked PAID.
 * Designed as a standalone function so it can be called from:
 *   - Admin PATCH /orders/{id} (current flow)
 *   - Future Razorpay webhook handler
 */
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function processCommissionForOrder(orderId: string): Promise<void> {
  // Fetch all items in this order, with product & its artist
  const orderItems = await db.query.orderItem.findMany({
    where: eq(schema.orderItem.orderId, orderId),
    with: {
      product: {
        with: { artistProfile: true }
      }
    }
  });

  for (const item of orderItems) {
    const product = item.product;
    if (!product?.artistProfileId || !product.artistProfile) continue; // safety guard

    const { artistShare, commissionType, newTotalCommissionPaid } = calculateArtistPayout(
      item.price,
      product.basePrice,
      product.totalCommissionPaid ?? 0
    );

    const releaseAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Write ledger entry
    await db.insert(schema.commissionLedger).values({
      id: crypto.randomUUID(),
      orderItemId: item.id,
      artistId: product.artistProfileId,
      productId: product.id,
      salePrice: item.price,
      artistShare,
      commissionType: commissionType === 'MIXED' ? 'INITIAL_33' : commissionType,
      status: 'PENDING',
      releaseAt,
    });

    // 2. Upsert artist wallet — add to pendingBalance
    await db.insert(schema.artistWallet)
      .values({
        id: crypto.randomUUID(),
        artistId: product.artistProfileId,
        availableBalance: 0,
        pendingBalance: artistShare,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.artistWallet.artistId,
        set: {
          pendingBalance: sql`"ArtistWallet"."pendingBalance" + ${artistShare}`,
          updatedAt: new Date().toISOString(),
        }
      });

    // 3. Update product's cumulative commission tracking
    await db.update(schema.product)
      .set({ totalCommissionPaid: newTotalCommissionPaid })
      .where(eq(schema.product.id, product.id));
  }
}
