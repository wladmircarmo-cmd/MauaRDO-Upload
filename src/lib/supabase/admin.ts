import { createClient } from "@supabase/supabase-js";
import { envServer } from "@/lib/env.server";

export function createSupabaseAdminClient() {
  return createClient(
    envServer.NEXT_PUBLIC_SUPABASE_URL,
    envServer.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

