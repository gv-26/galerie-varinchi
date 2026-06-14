import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
async function run() {
  const versions = await sql`SELECT * FROM "AgreementVersion"`;
  const consents = await sql`SELECT * FROM "ArtistAgreementConsent"`;
  console.log('VERSIONS:', versions);
  console.log('CONSENTS:', consents);
}
run();
