import { createClient } from '@supabase/supabase-js';

// Read config from Vite environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

const isValidSupabaseUrl = (url: string | undefined): url is string => {
  if (!url) return false;
  const lowercase = url.toLowerCase();
  if (
    url.includes("<") || 
    url.includes(">") || 
    lowercase.includes("your-project") || 
    lowercase.includes("placeholder") ||
    lowercase.includes("your-supabase-url")
  ) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_) {
    return false;
  }
};

const isValidSupabaseKey = (key: string | undefined): key is string => {
  if (!key) return false;
  const lowercase = key.toLowerCase();
  if (
    key.includes("<") || 
    key.includes(">") || 
    lowercase.includes("your-anon-key") || 
    lowercase.includes("placeholder")
  ) {
    return false;
  }
  return key.trim().length > 10;
};

export const isSupabaseConfigured = isValidSupabaseUrl(supabaseUrl) && isValidSupabaseKey(supabaseAnonKey);

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
