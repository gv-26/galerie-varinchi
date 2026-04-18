const { neon } = require('@neondatabase/serverless');

async function debug() {
  const url = process.env.DATABASE_URL;
  if (!url) return console.error('DATABASE_URL missing');
  const sql = neon(url);

  console.log('--- ALL Artist Profiles for KIRAN ---');
  const profiles = await sql`SELECT id, "userId", "fullName", status FROM "ArtistProfile" WHERE "fullName" ILIKE '%KIRAN%'`;
  console.log(JSON.stringify(profiles, null, 2));

  for (const p of profiles) {
    console.log(`\n--- Artist Wallet for ${p.id} (${p.fullName}) ---`);
    const wallet = await sql`SELECT * FROM "ArtistWallet" WHERE "artistId" = ${p.id}`;
    console.log(JSON.stringify(wallet, null, 2));

    console.log(`--- Ledger Count for ${p.id} ---`);
    const ledgers = await sql`SELECT status, count(*) FROM "CommissionLedger" WHERE "artistId" = ${p.id} GROUP BY status`;
    console.log(JSON.stringify(ledgers, null, 2));
  }

  console.log('\n--- Admin Stats Query (What Admin Sees) ---');
  const stats = await sql`SELECT status, count(*) FROM "Product" GROUP BY status`;
  console.log(JSON.stringify(stats, null, 2));

  console.log('\n--- Public Products List (Top 5) ---');
  const products = await sql`SELECT id, title, status FROM "Product" WHERE status != 'deleted' LIMIT 5`;
  console.log(JSON.stringify(products, null, 2));
}

debug();
