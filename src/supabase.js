import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Désactiver navigator.locks pour éviter les deadlocks (supabase-js #1594)
    // Un onglet/worker mort peut garder le lock indéfiniment → app bloquée.
    // La synchronisation cross-tab est gérée via BroadcastChannel dans auth.js.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  }
});