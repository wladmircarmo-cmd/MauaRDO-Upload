"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Handles the OAuth redirect from Supabase.
 * After the user authenticates with Google, Supabase redirects back to
 * `${origin}/auth/callback` with the session information.
 * We use `supabase.auth.getSessionFromUrl` which processes both query and hash
 * parameters, stores the session, and then redirects the user.
 */
export default function CallbackPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.getSessionFromUrl({
        storeSession: true,
      });
      if (error) {
        console.error("Supabase callback error:", error);
        router.replace("/login?error=unauthorized");
        return;
      }
      router.replace("/");
    };
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simple loading UI while processing.
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-50">
      <p className="text-lg font-medium">Finalizando login…</p>
    </div>
  );
}

