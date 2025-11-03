// Global type override to handle missing Supabase types
import type { SupabaseClient } from '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    from(table: string): any;
  }
}
