import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { envServer } from "@/lib/env.server";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    envServer.NEXT_PUBLIC_SUPABASE_URL,
    envServer.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can't set cookies; handled in middleware/route handlers.
          }
        },
      },
    },
  );
}

