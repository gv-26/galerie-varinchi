const { neon } = require('@neondatabase/serverless');

async function debug() {
  const url = process.env.DATABASE_URL;
  if (!url) return console.error('DATABASE_URL missing');
  const sql = neon(url);

  console.log('--- Orders (Recent 5) ---');
  const orders = await sql`SELECT id, "customerEmail", status, "totalAmount", "createdAt" FROM "Order" ORDER BY "createdAt" DESC LIMIT 5`;
  console.log(JSON.stringify(orders, null, 2));

  console.log('--- CommissionLedger for KIRAN GEORGE ---');
  const artistId = '3b5925d8-129f-4d66-b4d0-2982f44ba79f';
  const ledgers = await sql`SELECT id, "orderItemId", "artistShare", status, "createdAt" FROM "CommissionLedger" WHERE "artistId" = ${artistId}`;
  console.log(JSON.stringify(ledgers, null, 2));
}

debug();
