import { createClient } from '@supabase/supabase-js';

// Read config from Vite environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseInstance: any = null;

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
};

export const getAuthHeader = async (): Promise<Record<string, string>> => {
  const client = getSupabaseClient();
  if (!client) {
    return {};
  }
  try {
    const { data: { session } } = await client.auth.getSession();
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` };
    }
  } catch (err) {
    console.warn("Failed to get Supabase session auth header:", err);
  }
  return {};
};
