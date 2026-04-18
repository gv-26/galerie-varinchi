import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Manual .env loading if process.env.DATABASE_URL is missing
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
      if (match && match[1]) {
        process.env.DATABASE_URL = match[1];
      }
    }
  } catch (e) {
    console.error("Failed to load .env file manually:", e);
  }
}

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Error: DATABASE_URL not found in environment or .env file.");
    process.exit(1);
  }

  const sql = neon(url);
  try {
    console.log("Connecting to database and adding 'productId' column...");
    await sql`ALTER TABLE "ArtRequest" ADD COLUMN IF NOT EXISTS "productId" text;`;
    console.log("Column 'productId' added successfully!");
    
    // Also ensuring Product table has it (it should, but just in case)
    await sql`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "artistProfileId" text;`;
    console.log("Column 'artistProfileId' verified on Product table.");
    
  } catch (err) {
    console.error("Error during manual migration:", err);
  }
}

run();
