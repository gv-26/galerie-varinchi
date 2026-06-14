import { neon } from '@neondatabase/serverless';

async function test() {
  const sql = neon(process.env.DATABASE_URL);
  const versions = await sql`SELECT id, "versionNumber", "isActive" FROM "AgreementVersion" ORDER BY "createdAt" DESC`;
  console.log('VERSIONS:', versions);
}
test().catch(console.error);
