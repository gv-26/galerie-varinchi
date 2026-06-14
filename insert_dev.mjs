import { neon } from '@neondatabase/serverless';

async function test() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`UPDATE "AgreementVersion" SET "isActive" = false`;
  await sql`INSERT INTO "AgreementVersion" (id, "versionNumber", title, content, "isActive", "notifyArtists") VALUES (gen_random_uuid(), '2.0', 'Test Dev Agreement', 'Please sign this test agreement.', true, false)`;
  console.log('Inserted 2.0 into DEV DB');
}
test().catch(console.error);
