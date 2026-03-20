import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as relations from './relations';
import { getSecret } from '../lib/secrets';

const sql = neon(getSecret('DATABASE_URL') || '');
export const db = drizzle({ client: sql, schema: { ...schema, ...relations } });
