import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠ Supabase credentials not set — DB calls will fail');
}

// Server-side client with service role (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create a client scoped to a user's JWT (respects RLS)
export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
