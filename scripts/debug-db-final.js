const { neon } = require('@neondatabase/serverless');

async function debug() {
  const url = process.env.DATABASE_URL;
  if (!url) return console.error('DATABASE_URL missing');
  const sql = neon(url);

  console.log('--- Artist Profiles ---');
  const profiles = await sql`SELECT id, "userId", "fullName", status FROM "ArtistProfile"`;
  console.log(JSON.stringify(profiles, null, 2));

  console.log('--- Artist Wallets ---');
  const wallets = await sql`SELECT * FROM "ArtistWallet"`;
  console.log(JSON.stringify(wallets, null, 2));

  console.log('--- Commission Ledgers (Summary) ---');
  const ledgers = await sql`SELECT "artistId", status, count(*) FROM "CommissionLedger" GROUP BY "artistId", status`;
  console.log(JSON.stringify(ledgers, null, 2));

  console.log('--- Products (first 5) ---');
  const products = await sql`SELECT id, title, status FROM "Product" LIMIT 5`;
  console.log(JSON.stringify(products, null, 2));
}

debug();
