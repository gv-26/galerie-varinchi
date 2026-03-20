const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

async function check() {
  const envFile = fs.readFileSync('.env', 'utf-8');
  let dbUrl = '';
  envFile.split('\n').forEach(line => {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  });

  if (!dbUrl) {
    console.error("Missing DATABASE_URL in .env");
    return;
  }
  const sql = neon(dbUrl);
  
  console.log("Fetching latest OTPs from DB...");
  const rows = await sql`SELECT id, email, otp, used, "createdAt", "expiresAt" FROM "OtpToken" ORDER BY "createdAt" DESC LIMIT 5`;
  console.log(JSON.stringify(rows, null, 2));
}

check().catch(console.error);
