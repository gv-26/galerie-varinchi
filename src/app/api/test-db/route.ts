export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { category as categorySchema } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(categorySchema);
    const dbUrlPresent = !!process.env.DATABASE_URL;
    const dbUrlStart = process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + '...' : 'MISSING';

    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      categoryCount: Number(count),
      debug: {
        DATABASE_URL_present: dbUrlPresent,
        DATABASE_URL_preview: dbUrlStart,
        envKeys: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('URL') || k.includes('SECRET'))
      }
    });
  } catch (error: any) {
    const dbUrlPresent = !!process.env.DATABASE_URL;
    const dbUrlStart = process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + '...' : 'MISSING';
    
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error.message || String(error),
      debug: {
        DATABASE_URL_present: dbUrlPresent,
        DATABASE_URL_preview: dbUrlStart,
        envKeys: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('URL') || k.includes('SECRET'))
      }
    }, { status: 500 });
  }
}
