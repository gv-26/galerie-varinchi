require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function check() {
  const rows = await sql`SELECT * FROM "OtpToken" ORDER BY "createdAt" DESC LIMIT 5`;
  console.log(JSON.stringify(rows, null, 2));
}

check().catch(console.error);
