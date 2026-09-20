import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠ Supabase env variables not set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE is the correct flow for a browser app and survives a hard reload
    // of the callback page — the implicit hash flow does not.
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    // We exchange the code explicitly in /auth/callback, so don't race with it.
    detectSessionInUrl: false,
  },
});

/** Ensure a profile row exists for the signed-in user (first login bootstrap). */
export async function ensureProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return;

  await supabase.from('profiles').insert({
    id: user.id,
    email: user.email ?? '',
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  });
}
