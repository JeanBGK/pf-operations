import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
});

// Helper for core schema queries (customers, products, warehouses)
export const supabaseCore = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'core' },
});

// Helper for inventory schema
export const supabaseInventory = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'inventory' },
});

// Helper for purchasing schema (stock replenishment queries)
export const supabasePurchasing = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'purchasing' },
});
