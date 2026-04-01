import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Missing Supabase env variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
