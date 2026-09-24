import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { demoClient } from './demoClient';

// Demo mode (`npm run demo`) swaps in an in-memory client with sample data and no network access.
export const isDemo = import.meta.env.VITE_DEMO === '1';

// Placeholders for Supabase config
// The user must replace these with their actual Supabase project URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3N1ZXIiOiJzdXBhYmFzZSJ9.xxxxx';

export const supabase: SupabaseClient = isDemo ? demoClient : createClient(supabaseUrl, supabaseAnonKey);

// A second client that does not persist its session, so an admin can sign up new users
// without being logged out.
export function createIsolatedAuthClient(): SupabaseClient {
  if (isDemo) return demoClient;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
