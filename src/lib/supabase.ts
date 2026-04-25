import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client during build time / SSR without env vars
    _supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
  } else {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  return _supabase;
}

export const supabase = getSupabaseClient();
