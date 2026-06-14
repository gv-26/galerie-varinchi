import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import fs from 'fs';
import * as schema from './src/db/schema';
import crypto from 'crypto';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function run() {
  console.log("Running migration...");
  const migrationStr = fs.readFileSync('./drizzle/0000_charming_tombstone.sql', 'utf8');
  const statements = migrationStr.split(';').filter(s => s.trim().length > 0);
  
  for (const stmt of statements) {
    try {
      await sql(stmt);
    } catch(e) {
      console.log("Skip:", e.message);
    }
  }

  console.log("Seeding V1.0 agreement...");
  const text = fs.readFileSync('./src/constants/agreement.ts', 'utf8');
  // Extract text from the template literal
  const startIdx = text.indexOf('`') + 1;
  const endIdx = text.lastIndexOf('`');
  const agreementText = text.substring(startIdx, endIdx);

  try {
    const [existing] = await db.select().from(schema.agreementVersion);
    if (!existing) {
      await db.insert(schema.agreementVersion).values({
        id: crypto.randomUUID(),
        versionNumber: '1.0',
        title: 'Artist Collaboration Agreement',
        content: agreementText,
        isActive: true,
        notifyArtists: false,
        publishedAt: new Date().toISOString()
      });
      console.log("Seed successful.");
    } else {
      console.log("Already seeded.");
    }
  } catch(e) {
    console.error("Seed error:", e);
  }
}

run();
