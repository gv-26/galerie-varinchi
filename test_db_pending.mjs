import { neon } from '@neondatabase/serverless';

async function test() {
  const sql = neon(process.env.DATABASE_URL);
  const versions = await sql`SELECT * FROM "AgreementVersion" ORDER BY "createdAt" DESC`;
  const consents = await sql`SELECT * FROM "ArtistAgreementConsent"`;
  const profiles = await sql`SELECT * FROM "ArtistProfile"`;
  console.log('VERSIONS:', versions);
  console.log('CONSENTS:', consents);
  console.log('PROFILES:', profiles);
}
test().catch(console.error);
