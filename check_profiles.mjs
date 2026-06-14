import { neon } from '@neondatabase/serverless';

async function test() {
  const sql = neon(process.env.DATABASE_URL);
  const profiles = await sql`SELECT email FROM "ArtistProfile"`;
  console.log('Profiles in DB:', profiles);
}
test().catch(console.error);
