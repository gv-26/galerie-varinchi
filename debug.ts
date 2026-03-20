import { db } from './src/db';
import * as schema from './src/db/schema';
import { eq, desc } from 'drizzle-orm';

async function check() {
  const email = 'kiran.geo96@gmail.com';
  console.log(`Checking OTPs for: ${email}`);
  
  const records = await db.query.otpToken.findMany({
    where: eq(schema.otpToken.email, email),
    orderBy: [desc(schema.otpToken.createdAt)],
    limit: 5
  });
  
  console.log(records);
  process.exit(0);
}

check().catch(console.error);
