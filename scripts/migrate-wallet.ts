/**
 * One-time additive migration for the Artist Wallet feature.
 * Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 * Run with: DATABASE_URL=... npx tsx scripts/migrate-wallet.ts
 */
import { neon } from '@neondatabase/serverless';

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL env var required'); process.exit(1); }
  const sql = neon(url);

  console.log('Starting wallet migration...');

  // 1. Add new columns to existing tables
  await sql`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "totalCommissionPaid" double precision NOT NULL DEFAULT 0`;
  console.log('✓ Product.totalCommissionPaid added');

  await sql`ALTER TABLE "ArtistProfile" ADD COLUMN IF NOT EXISTS "bankName" text`;
  await sql`ALTER TABLE "ArtistProfile" ADD COLUMN IF NOT EXISTS "accountNumber" text`;
  await sql`ALTER TABLE "ArtistProfile" ADD COLUMN IF NOT EXISTS "ifscCode" text`;
  await sql`ALTER TABLE "ArtistProfile" ADD COLUMN IF NOT EXISTS "bankBranch" text`;
  console.log('✓ ArtistProfile bank fields added');

  // 2. Create ArtistWallet table
  await sql`
    CREATE TABLE IF NOT EXISTS "ArtistWallet" (
      "id" text PRIMARY KEY NOT NULL,
      "artistId" text NOT NULL UNIQUE,
      "availableBalance" double precision NOT NULL DEFAULT 0,
      "pendingBalance" double precision NOT NULL DEFAULT 0,
      "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ArtistWallet_artistId_fkey" FOREIGN KEY ("artistId")
        REFERENCES "ArtistProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE
    )
  `;
  console.log('✓ ArtistWallet table created');

  // 3. Create CommissionLedger table
  await sql`
    CREATE TABLE IF NOT EXISTS "CommissionLedger" (
      "id" text PRIMARY KEY NOT NULL,
      "orderItemId" text NOT NULL,
      "artistId" text NOT NULL,
      "productId" text NOT NULL,
      "salePrice" double precision NOT NULL,
      "artistShare" double precision NOT NULL,
      "commissionType" text NOT NULL,
      "status" text NOT NULL DEFAULT 'PENDING',
      "releaseAt" timestamp(3) NOT NULL,
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CommissionLedger_artistId_fkey" FOREIGN KEY ("artistId")
        REFERENCES "ArtistProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT "CommissionLedger_productId_fkey" FOREIGN KEY ("productId")
        REFERENCES "Product"("id") ON UPDATE CASCADE ON DELETE CASCADE
    )
  `;
  console.log('✓ CommissionLedger table created');

  // 4. Seed ArtistWallet for all approved artists that don't have one yet
  const approved = await sql`
    SELECT id FROM "ArtistProfile"
    WHERE status = 'APPROVED'
    AND id NOT IN (SELECT "artistId" FROM "ArtistWallet")
  `;
  for (const artist of approved) {
    const walletId = crypto.randomUUID();
    await sql`
      INSERT INTO "ArtistWallet" ("id", "artistId", "availableBalance", "pendingBalance", "updatedAt")
      VALUES (${walletId}, ${artist.id}, 0, 0, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING
    `;
  }
  console.log(`✓ Seeded ${approved.length} artist wallet(s)`);

  console.log('\n✅ Migration complete!');
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
