/**
 * Wallet Release Cron — runs daily via AWS EventBridge (SST Cron).
 *
 * Finds all PENDING CommissionLedger entries whose `releaseAt` has passed,
 * then moves the funds from pendingBalance → availableBalance in the artist wallet.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, lte, inArray, sql as drizzleSql } from 'drizzle-orm';
import * as schema from '../db/schema';
import * as relations from '../db/relations';

export const handler = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');

  const client = neon(url);
  const db = drizzle({ client, schema: { ...schema, ...relations } });

  const now = new Date().toISOString();

  const dueEntries = await db.query.commissionLedger.findMany({
    where: and(
      eq(schema.commissionLedger.status, 'PENDING'),
      lte(schema.commissionLedger.releaseAt, now)
    ),
  });

  console.log(`[WalletCron] Found ${dueEntries.length} entries to release`);

  if (dueEntries.length === 0) {
    return { released: 0 };
  }

  // Group by artist for efficient wallet updates
  const byArtist = new Map<string, typeof dueEntries>();
  for (const entry of dueEntries) {
    const list = byArtist.get(entry.artistId) ?? [];
    list.push(entry);
    byArtist.set(entry.artistId, list);
  }

  for (const [artistId, entries] of byArtist) {
    const totalToRelease = Math.round(
      entries.reduce((sum, e) => sum + e.artistShare, 0) * 100
    ) / 100;

    // Move funds: pendingBalance → availableBalance
    await db
      .update(schema.artistWallet)
      .set({
        availableBalance: drizzleSql`"ArtistWallet"."availableBalance" + ${totalToRelease}`,
        pendingBalance: drizzleSql`GREATEST(0, "ArtistWallet"."pendingBalance" - ${totalToRelease})`,
        updatedAt: now,
      })
      .where(eq(schema.artistWallet.artistId, artistId));

    // Mark all entries as COMPLETED in a single batched UPDATE
    const ids = entries.map((e) => e.id);
    await db
      .update(schema.commissionLedger)
      .set({ status: 'COMPLETED' })
      .where(inArray(schema.commissionLedger.id, ids));

    console.log(
      `[WalletCron] Released ₹${totalToRelease} for artist ${artistId} (${entries.length} entries)`
    );
  }

  return { released: dueEntries.length };
};
