/**
 * Wallet Release Cron — runs daily via AWS EventBridge (SST Cron).
 * Finds all PENDING CommissionLedger entries whose releaseAt has passed,
 * then moves the funds from pendingBalance → availableBalance.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import * as relations from '../db/relations';
import { eq, and, lte, sql } from 'drizzle-orm';

export const handler = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');

  const sqlClient = neon(url);
  const db = drizzle({ client: sqlClient, schema: { ...schema, ...relations } });

  const now = new Date().toISOString();

  // Find all PENDING ledger entries ready to release
  const dueEntries = await db.query.commissionLedger.findMany({
    where: and(
      eq(schema.commissionLedger.status, 'PENDING'),
      lte(schema.commissionLedger.releaseAt, now)
    )
  });

  console.log(`[WalletCron] Found ${dueEntries.length} entries to release`);

  // Group by artist for efficiency
  const byArtist = new Map<string, typeof dueEntries>();
  for (const entry of dueEntries) {
    const list = byArtist.get(entry.artistId) || [];
    list.push(entry);
    byArtist.set(entry.artistId, list);
  }

  for (const [artistId, entries] of byArtist) {
    const totalToRelease = entries.reduce((sum, e) => sum + e.artistShare, 0);
    const roundedTotal = Math.round(totalToRelease * 100) / 100;

    // Move funds: pendingBalance → availableBalance
    await db.update(schema.artistWallet)
      .set({
        availableBalance: sql`"ArtistWallet"."availableBalance" + ${roundedTotal}`,
        pendingBalance: sql`GREATEST(0, "ArtistWallet"."pendingBalance" - ${roundedTotal})`,
        updatedAt: now,
      })
      .where(eq(schema.artistWallet.artistId, artistId));

    // Mark all entries as COMPLETED
    for (const entry of entries) {
      await db.update(schema.commissionLedger)
        .set({ status: 'COMPLETED' })
        .where(eq(schema.commissionLedger.id, entry.id));
    }

    console.log(`[WalletCron] Released ₹${roundedTotal} for artist ${artistId} (${entries.length} entries)`);
  }

  return { released: dueEntries.length };
};
