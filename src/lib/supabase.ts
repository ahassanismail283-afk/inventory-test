import { createClient } from '@supabase/supabase-js';
// Placeholders for Supabase config
// The user must replace these with their actual Supabase project URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3N1ZXIiOiJzdXBhYmFzZSJ9.xxxxx';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
